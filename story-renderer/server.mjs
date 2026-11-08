import http from 'node:http'
import crypto from 'node:crypto'
import {createReadStream} from 'node:fs'
import {mkdir, readdir, stat, unlink, rename} from 'node:fs/promises'
import sharp from 'sharp'
import {validParolImage, parolImageDigest, PAROL_IMAGE_COMPOSITION} from './parolImage.mjs'
import {createStoryVideoJobs} from './storyVideoJobs.mjs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {bundle} from '@remotion/bundler'
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer'

const directory = path.dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.PORT || 7070)
const secret = process.env.STORY_RENDERER_SECRET
if (!secret || secret.length < 24) throw new Error('Set a private STORY_RENDERER_SECRET (at least 24 characters).')
const renderDir = path.join(tmpdir(), 'bemyparol-story-exports')
const imageDir = path.join(tmpdir(), 'bemyparol-parol-images')
await mkdir(renderDir, {recursive:true})
await mkdir(imageDir, {recursive:true})

// Use pre-built bundle in production, dynamic bundle in development
const isProduction = process.env.NODE_ENV === 'production'
let serveUrl
if (isProduction) {
  // Read pre-built bundle info
  const bundleInfoPath = path.join(directory, 'dist', 'bundle-info.json')
  const bundleInfo = JSON.parse(await import('node:fs/promises').then(fs => fs.readFile(bundleInfoPath, 'utf8')))
  serveUrl = bundleInfo.serveUrl
  console.log('Using pre-built Remotion bundle:', serveUrl)
} else {
  // Dynamic bundling for development
  serveUrl = await bundle({
    entryPoint: path.join(directory,'remotionEntry.tsx'),
    webpackOverride: config => ({
      ...config,
      resolve: {
        ...config.resolve,
        modules: [path.join(directory, 'node_modules'), 'node_modules'],
        alias: {
          ...config.resolve?.alias,
          react: path.join(directory, 'node_modules/react'),
          'react-dom': path.join(directory, 'node_modules/react-dom'),
        },
      },
    }),
  })
}
// Separate semaphores for images (concurrent) and videos (serialized)
let videoBusy = false
const imageSemaphore = { count: 3, waiting: [] } // Allow up to 3 concurrent image renders
const videoJobs = createStoryVideoJobs({
  renderDir,
  isBusy: () => videoBusy,
  setBusy: value => { videoBusy = value },
  cleanup,
  renderVideo: async (payload, output) => {
    const {kind, designKey, patternKey, friendCount, slots, highlightSlot} = payload
    const inputProps = {kind, designKey, patternKey, friendCount, slots, highlightSlot}
    const composition = await selectComposition({serveUrl, id:'BeMyParolStory', inputProps})
    await renderMedia({composition, serveUrl, codec:'h264', outputLocation:output, inputProps,
      concurrency:2, crf:24, logLevel:'error', chromiumOptions:{enableMultiProcessOnLinux:true}})
  },
})

/*
 * Shared design/pattern constants — values must match DesignConstants in the backend.
 * Backend: /Users/stephen/Documents/DecoMyLantern/DecoMyLantern/src/backend/DecoMyLantern.Api/Services/Shared/DesignConstants.cs
 */
const values = ['classic','floral','festival','celestial','fiesta','sampaguita']
const patterns = ['default','rings','rays']
function valid(input) {
  return input && typeof input === 'object'
    && ['owner','friend'].includes(input.kind)
    && values.includes(input.designKey)
    && patterns.includes(input.patternKey)
    && ['mp4','png'].includes(input.format)
    && Number.isSafeInteger(input.friendCount) && input.friendCount >= 0 && input.friendCount <= 10000
    && Array.isArray(input.slots) && input.slots.length <= 500
    && input.slots.every(n=>Number.isSafeInteger(n)&&n>=0&&n<=100000)
    && (input.highlightSlot === null || (Number.isSafeInteger(input.highlightSlot)
      && input.slots.includes(input.highlightSlot)))
}
async function cleanup() {
  const entries = await readdir(renderDir)
  const now = Date.now()
  const sorted = []
  for (const file of entries) {
    const full = path.join(renderDir,file)
    const info = await stat(full)
    if (now - info.mtimeMs > 24*60*60*1000) await unlink(full)
    else sorted.push({full,time:info.mtimeMs})
  }
  for (const entry of sorted.sort((a,b)=>b.time-a.time).slice(32)) await unlink(entry.full)
}
async function cleanupImages() {
  const now = Date.now()
  const keep = []
  for (const name of await readdir(imageDir)) {
    const file = path.join(imageDir, name)
    const info = await stat(file).catch(() => null)
    if (!info || !info.isFile()) continue
    if (now - info.mtimeMs > 24 * 60 * 60 * 1000) await unlink(file).catch(() => {})
    else if (name.endsWith('.png') || name.endsWith('.webp'))
      keep.push({file, name, mtime: info.mtimeMs})
  }
  // Keep normal snapshots prioritized: at most 32 2x and 12 3x WebPs
  // within the original 128-image / 24-hour private disk cache.
  let retained = 0
  let doubleRetained = 0
  let tripleRetained = 0
  for (const item of keep.sort((a, b) => b.mtime - a.mtime)) {
    const double = item.name.endsWith('-2x.webp')
    const triple = item.name.endsWith('-3x.webp')
    if (retained >= 128 || (double && doubleRetained >= 32) ||
        (triple && tripleRetained >= 12)) {
      await unlink(item.file).catch(() => {})
      continue
    }
    retained++
    if (double) doubleRetained++
    if (triple) tripleRetained++
  }
}

async function readPayload(req, res) {
  let payload = ''
  for await (const chunk of req) {
    payload += chunk.toString('utf8')
    if (payload.length > 32_000) {
      respond(res, 413, 'Request too large')
      return null
    }
  }
  try {
    const value = JSON.parse(payload)
    if (value === null) { respond(res, 400, 'Invalid parol image data'); return null }
    return value
  } catch { respond(res, 400, 'Invalid JSON'); return null }
}

async function serveImage(res, file, format, cached) {
  const info = await stat(file)
  res.writeHead(200, {
    'content-type': format === 'webp' ? 'image/webp' : 'image/png',
    'content-length': info.size,
    'cache-control': 'private, no-store',
    'x-parol-cache': cached ? 'HIT' : 'MISS',
  })
  createReadStream(file).pipe(res)
}

/**
 * Internal-only snapshot rendering. Reuses the SAME React/SVG components as
 * the live parol; caches one flattened image per canonical parol state.
 * The contribution endpoint is never blocked waiting for this renderer.
 */
async function renderParolImage(req, res) {
  const request = await readPayload(req, res)
  if (request === null) return
  if (!validParolImage(request)) return respond(res, 400, 'Invalid parol image data')

  const {designKey, patternKey, friendCount, slots, format} = request
  const scale = request.scale === 2 || request.scale === 3 ? request.scale : 1
  const digest = parolImageDigest(request)
  // Existing 1x and 2x filenames remain untouched for cache compatibility.
  const file = path.join(imageDir, digest + (scale > 1 ? `-${scale}x` : '') + '.' + format)
  const cachedInfo = await stat(file).catch(() => null)
  if (cachedInfo?.isFile() && cachedInfo.size > 512 &&
      Date.now() - cachedInfo.mtimeMs < 24 * 60 * 60 * 1000)
    return await serveImage(res, file, format, true)

  // Acquire semaphore slot for concurrent image rendering (max 3)
  let released = false
  async function acquireImageSlot() {
    return new Promise((resolve) => {
      if (imageSemaphore.count > 0) {
        imageSemaphore.count--
        resolve()
      } else {
        imageSemaphore.waiting.push(resolve)
      }
    })
  }
  function releaseImageSlot() {
    if (released) return
    released = true
    if (imageSemaphore.waiting.length > 0) {
      const next = imageSemaphore.waiting.shift()
      next()
    } else {
      imageSemaphore.count++
    }
  }

  await acquireImageSlot()
  const tmpPng = file + '.' + crypto.randomUUID() + '.tmp.png'
  const tmpWebp = file + '.' + crypto.randomUUID() + '.tmp.webp'
  try {
    // Select only the snapshot composition; do not re-render a Story frame.
    const inputProps = {designKey, patternKey, friendCount, slots}
    const composition = await selectComposition({
      serveUrl, id: PAROL_IMAGE_COMPOSITION, inputProps,
    })
    await renderStill({
      composition, serveUrl, output: tmpPng, inputProps,
      frame: 0, imageFormat: 'png', scale,
    })
    if (format === 'webp') {
      await sharp(tmpPng).webp({quality: 86, effort: 4}).toFile(tmpWebp)
      await rename(tmpWebp, file)
    } else {
      await rename(tmpPng, file)
    }
    await serveImage(res, file, format, false)
    void cleanupImages().catch(err => console.warn('Parol image cleanup failed:', err))
  } catch (err) {
    console.error('Parol image render failed:', err)
    if (!res.headersSent) respond(res, 500, 'Unable to generate parol image')
    else res.destroy()
  } finally {
    releaseImageSlot()
    await Promise.all([unlink(tmpPng).catch(() => {}), unlink(tmpWebp).catch(() => {})])
  }
}

function authorized(req) {
  const given = req.headers['x-story-renderer-key']
  if (typeof given !== 'string') return false
  const a = Buffer.from(given), b = Buffer.from(secret)
  return a.length === b.length && crypto.timingSafeEqual(a,b)
}
function respond(res, status, message) {
  res.writeHead(status, {'content-type':'application/json','cache-control':'no-store'})
  res.end(JSON.stringify({message}))
}
const server = http.createServer(async(req,res)=>{
  if (req.url === '/health' && req.method === 'GET') {
    // Enhanced health check: verify disk space, bundle validity, and render capability
    try {
      const bundleStat = await stat(serveUrl).catch(() => null)
      if (!bundleStat) return respond(res, 503, 'Remotion bundle not available')

      // Check temp directories are writable
      await mkdir(renderDir, {recursive:true})
      await mkdir(imageDir, {recursive:true})
      const testFile = path.join(renderDir, '.health-check')
      await import('node:fs/promises').then(fs => fs.writeFile(testFile, 'ok'))
      await import('node:fs/promises').then(fs => fs.unlink(testFile))

      return respond(res, 200, 'ready')
    } catch (e) {
      console.error('Health check failed:', e)
      return respond(res, 503, 'Health check failed: ' + e.message)
    }
  }
  // Private video jobs receive server-verified parol state, never a public file path.
  if (['/story-video/start', '/story-video/status', '/story-video/file'].includes(req.url)) {
    if (req.method !== 'POST') return respond(res,405,'Method not allowed')
    if (!authorized(req)) return respond(res,403,'Forbidden')
    const payload = await readPayload(req,res)
    if (payload === null) return
    if (!valid(payload) || payload.format !== 'mp4') return respond(res,400,'Invalid video state')
    try {
      if (req.url === '/story-video/start') {
        const job = await videoJobs.start(payload)
        res.writeHead(job.status === 'busy' ? 503 : 202, {
          'content-type':'application/json', 'cache-control':'no-store',
        })
        return res.end(JSON.stringify({status:job.status}))
      }
      if (req.url === '/story-video/status') {
        const job = await videoJobs.status(payload)
        res.writeHead(200, {'content-type':'application/json', 'cache-control':'no-store'})
        return res.end(JSON.stringify({status:job.status}))
      }
      if (!await videoJobs.completed(payload)) return respond(res,404,'Video not ready')
      const file = videoJobs.filename(payload)
      const info = await stat(file)
      res.writeHead(200, {
        'content-type':'video/mp4', 'content-length':info.size,
        'cache-control':'private, no-store',
      })
      return createReadStream(file).pipe(res)
    } catch (error) {
      console.error('Story video job request failed:',error)
      return respond(res,500,'Video job unavailable')
    }
  }
  if (!['/render', '/render-parol'].includes(req.url) || req.method !== 'POST')
    return respond(res,404,'Not found')
  if (!authorized(req)) return respond(res,403,'Forbidden')
  if (req.url === '/render-parol') return await renderParolImage(req, res)
  if (videoBusy) return respond(res,503,'Story renderer is busy. Retry shortly.')
  let payload = ''
  try {
    for await (const chunk of req) {
      payload += chunk.toString('utf8')
      if (payload.length > 32_000) return respond(res,413,'Request too large')
    }
    const request = JSON.parse(payload)
    if (!valid(request)) return respond(res,400,'Invalid story data')
    // Only accept server-retrieved public fields, never a URL or HTML fragment.
    const {kind,designKey,patternKey,friendCount,slots,highlightSlot,format} = request
    const inputProps = {kind,designKey,patternKey,friendCount,slots,highlightSlot}
    const digest = crypto.createHash('sha256').update(JSON.stringify({...inputProps,format})).digest('hex')
    const file = path.join(renderDir, digest+(format==='png'?'.png':'.mp4'))
    if (videoBusy) return respond(res,503,'Story renderer is busy. Retry shortly.')
    videoBusy = true
    try {
      let cached = false
      try { cached = (await stat(file)).size > 1024 } catch { /* first render */ }
      if (!cached) {
        const composition = await selectComposition({serveUrl,id:'BeMyParolStory',inputProps})
        if (format === 'png') {
          await renderStill({composition,serveUrl,output:file,inputProps,frame:200,imageFormat:'png'})
        } else {
          await renderMedia({composition,serveUrl,codec:'h264',outputLocation:file,inputProps,
            concurrency:2,crf:24,logLevel:'error',chromiumOptions:{enableMultiProcessOnLinux:true}})
        }
      }
      const info = await stat(file)
      res.writeHead(200,{
        'content-type':format==='png'?'image/png':'video/mp4',
        'content-length':info.size,
        'cache-control':'private, max-age=300',
      })
      createReadStream(file).pipe(res)
      void cleanup().catch(()=>{})
    } finally { busy = false }
  } catch(e) {
    console.error('Story render failed:',e)
    if (!res.headersSent) respond(res,500,'Unable to render story')
    else res.destroy()
  }
})
server.listen(port,'0.0.0.0',()=>console.log('Story renderer on '+port))
