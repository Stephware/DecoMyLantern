import http from 'node:http'
import crypto from 'node:crypto'
import {createReadStream} from 'node:fs'
import {mkdir, readdir, stat, unlink, rename} from 'node:fs/promises'
import sharp from 'sharp'
import {validParolImage, parolImageDigest, PAROL_IMAGE_COMPOSITION} from './parolImage.mjs'
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
const serveUrl = await bundle({
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
let busy = false

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
      keep.push({file, mtime: info.mtimeMs})
  }
  // Keep the cache bounded independently of Story video exports.
  for (const item of keep.sort((a, b) => b.mtime - a.mtime).slice(128))
    await unlink(item.file).catch(() => {})
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
  try { return JSON.parse(payload) }
  catch { respond(res, 400, 'Invalid JSON'); return null }
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
  const digest = parolImageDigest(request)
  const file = path.join(imageDir, digest + '.' + format)
  const cachedInfo = await stat(file).catch(() => null)
  if (cachedInfo?.isFile() && cachedInfo.size > 512 &&
      Date.now() - cachedInfo.mtimeMs < 24 * 60 * 60 * 1000)
    return await serveImage(res, file, format, true)

  if (busy) {
    res.setHeader('Retry-After', '2')
    return respond(res, 503, 'Image renderer is busy. Retry shortly.')
  }

  busy = true
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
      frame: 0, imageFormat: 'png',
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
    busy = false
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
  if (req.url === '/health' && req.method === 'GET') return respond(res,200,'ready')
  if (!['/render', '/render-parol'].includes(req.url) || req.method !== 'POST')
    return respond(res,404,'Not found')
  if (!authorized(req)) return respond(res,403,'Forbidden')
  if (req.url === '/render-parol') return await renderParolImage(req, res)
  if (busy) return respond(res,503,'Story renderer is busy. Retry shortly.')
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
    if (busy) return respond(res,503,'Story renderer is busy. Retry shortly.')
    busy = true
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
