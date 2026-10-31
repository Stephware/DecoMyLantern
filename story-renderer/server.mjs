import http from 'node:http'
import crypto from 'node:crypto'
import {createReadStream} from 'node:fs'
import {mkdir, readdir, stat, unlink, rename, rm, mkdtemp, readFile} from 'node:fs/promises'
import sharp from 'sharp'
import {validParolImage, parolImageDigest, PAROL_IMAGE_COMPOSITION} from './parolImage.mjs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {bundle} from '@remotion/bundler'
import {renderMedia, renderStill, selectComposition, makeCancelSignal, openBrowser} from '@remotion/renderer'
import {compositionFor, renderDigest, TEMPLATE_VERSION} from './composition.mjs'
import {renderFfmpeg, RenderError} from './ffmpegRenderer.mjs'
import {cachedExport, pruneExports} from './renderCache.mjs'
import {selectRenderer} from './rendererSelection.mjs'
import {RenderQueue} from './renderQueue.mjs'

const directory = path.dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.PORT || 7070)
const secret = process.env.STORY_RENDERER_SECRET
if (!secret || secret.length < 24) throw new Error('Set a private STORY_RENDERER_SECRET (at least 24 characters).')
const renderDir = path.join(tmpdir(), 'bemyparol-story-exports')
const imageDir = path.join(tmpdir(), 'bemyparol-parol-images')
const assetDir = path.join(directory, 'assets', 'generated', 'standard')
// Re-audit layer behavior before changing this fingerprint. A new animation in
// the parol artwork must not be silently flattened into stage PNGs.
const supportedVisualSha256 = '607f665df392a2255ed52b041af9a4ee75046a22c8dc50f51402f4048d215e4f'
const mode = process.env.STORY_RENDERER_MODE || 'remotion'
if (!['remotion', 'ffmpeg'].includes(mode)) throw new Error('Invalid STORY_RENDERER_MODE')
const renderPreset = process.env.STORY_RENDERER_PRESET || 'standard'
if (!['standard','high'].includes(renderPreset)) throw new Error('Invalid STORY_RENDERER_PRESET')
const configuredTimeout = Number(process.env.STORY_RENDERER_TIMEOUT_MS || 240_000)
if (!Number.isFinite(configuredTimeout)) throw new Error('Invalid STORY_RENDERER_TIMEOUT_MS')
const timeoutMs = Math.max(10_000, Math.min(600_000, configuredTimeout))
const maxPending = Number(process.env.STORY_RENDERER_MAX_PENDING || 3)
const queue = new RenderQueue({maxPending})
await mkdir(renderDir, {recursive:true})
await mkdir(imageDir, {recursive:true})
const sourceFiles = [
  'story-renderer/package.json',
  'story-renderer/server.mjs', 'story-renderer/remotionEntry.tsx',
  'story-renderer/composition.mjs', 'story-renderer/ffmpegRenderer.mjs',
  'story-renderer/renderCache.mjs',
  'story-renderer/rendererSelection.mjs',
  'story-renderer/renderQueue.mjs', 'story-renderer/vectorEntry.tsx',
  'story-renderer/vectorBundle.mjs',
]
const sourceHash = crypto.createHash('sha256')
for (const file of sourceFiles) sourceHash.update(await readFile(path.join(directory, '..', file)))
// Frontend source contains the parol geometry, fonts/styles and Story timing.
async function hashTree(dir) {
  for (const item of (await readdir(dir, {withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))) {
    const full = path.join(dir,item.name)
    if (item.isDirectory()) await hashTree(full)
    else if (item.isFile()) { sourceHash.update(full); sourceHash.update(await readFile(full)) }
  }
}
await hashTree(path.join(directory, '..', 'src', 'frontend', 'src'))
await hashTree(path.join(directory, '..', 'src', 'frontend', 'public', 'story-assets'))
await hashTree('/usr/share/fonts').catch(error => {
  if (error.code !== 'ENOENT') throw error
})
if (mode === 'ffmpeg') sourceHash.update(await readFile(process.env.FFMPEG_PATH || '/usr/bin/ffmpeg'))
sourceHash.update(process.version)
const sourceDigest = sourceHash.digest('hex')
const visualRoot = path.join(directory, '..', 'src', 'frontend', 'src')
const visualFiles = [
  'features/story/StoryFrame.tsx', 'features/story/storySpec.ts',
  'features/customization/themes.ts',
]
for (const folder of ['features/lantern/renderer', 'features/lantern/growth']) {
  const visit = async relative => {
    for (const item of await readdir(path.join(visualRoot, relative), {withFileTypes:true})) {
      const child = `${relative}/${item.name}`
      if (item.isDirectory()) await visit(child)
      else if (item.isFile()) visualFiles.push(child)
    }
  }
  await visit(folder)
}
const visualHash = crypto.createHash('sha256')
for (const relative of visualFiles.sort()) {
  visualHash.update(relative)
  visualHash.update(await readFile(path.join(visualRoot, relative)))
}
const visualsSupported = visualHash.digest('hex') === supportedVisualSha256
let background = null
let assetDigest = null
if (mode === 'ffmpeg') {
  const assetLoadStart = performance.now()
  try {
    const manifest = JSON.parse(await readFile(path.join(assetDir, 'manifest.json'), 'utf8'))
    const file = path.join(assetDir, 'background.mp4')
    const digest = crypto.createHash('sha256').update(await readFile(file)).digest('hex')
    const backgroundSourceSha256 = crypto.createHash('sha256').update(await readFile(
      path.join(directory, '..', 'src', 'frontend', 'src', 'features', 'story', 'StoryFrame.tsx')))
      .digest('hex')
    const asset = manifest.assets?.find(item => item.id === 'story-background')
    if (!visualsSupported || manifest.templateVersion !== TEMPLATE_VERSION ||
        asset?.sha256 !== digest || asset?.sourceSha256 !== backgroundSourceSha256 ||
        asset?.width !== 720 || asset?.height !== 1280 || asset?.fps !== 24 ||
        asset?.duration !== 8)
      throw new Error('Story visuals changed or background asset is out of date')
    background = file
    assetDigest = digest
    console.log('Story asset load',JSON.stringify({milliseconds:Math.round(performance.now()-assetLoadStart),bytes:(await stat(file)).size}))
  } catch (error) {
    console.warn('FFmpeg asset unavailable; Story MP4s will use Remotion:', error)
  }
}
const bundleStart = performance.now()
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
console.log('Story Chromium bundle',JSON.stringify({milliseconds:Math.round(performance.now()-bundleStart)}))
let vectorSvg = null
if (mode === 'ffmpeg' && background) {
  try { ({renderVectorSvg:vectorSvg} = await import('./.generated/vector.mjs')) }
  catch (error) { console.warn('SVG rasterizer unavailable; using Remotion:', error); background = null }
}
let busy = false
const inFlight = new Map()

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
await pruneExports(renderDir, {removeAbandoned:true})
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
  const digest = parolImageDigest(request)
  const file = path.join(imageDir, digest + '.' + format)
  const cachedInfo = await stat(file).catch(() => null)
  if (cachedInfo?.isFile() && cachedInfo.size > 512 &&
      Date.now() - cachedInfo.mtimeMs < 24 * 60 * 60 * 1000)
    return await serveImage(res, file, format, true)

  if (busy || queue.active > 0) {
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
async function renderExport(file, format, inputProps, controller, onProgress = () => {}) {
  const workDir = await mkdtemp(path.join(renderDir, 'job-'))
  const temporary = path.join(workDir, format === 'png' ? 'output.png' : 'output.mp4')
  const timer = setTimeout(() => controller.abort(new RenderError('TIMEOUT', 'Render deadline exceeded')), timeoutMs)
  const {cancelSignal, cancel} = makeCancelSignal()
  const onAbort = () => cancel()
  controller.signal.addEventListener('abort', onAbort, {once:true})
  try {
    if (controller.signal.aborted) throw controller.signal.reason
    const renderer = selectRenderer(format, mode, !!background && renderPreset === 'standard')
    const videoId = renderPreset === 'high' ? 'BeMyParolStoryHigh' : 'BeMyParolStory'
    const renderRemotion = async () => {
      const composition = await selectComposition({serveUrl,id:videoId,inputProps})
      await renderMedia({composition,serveUrl,codec:'h264',outputLocation:temporary,inputProps,
        concurrency:2,crf:24,logLevel:'error',cancelSignal,
        chromiumOptions:{enableMultiProcessOnLinux:true}})
    }
    if (format === 'png') {
      const composition = await selectComposition({serveUrl,id:'BeMyParolStoryHigh',inputProps})
      await renderStill({composition,serveUrl,output:temporary,inputProps,frame:200,
        imageFormat:'png',cancelSignal})
    } else if (renderer === 'ffmpeg') {
      try {
        await renderFfmpeg({serveUrl, renderStill, selectComposition, openBrowser, inputProps,
          background, workDir, output:temporary, signal:controller.signal, cancelSignal,
          vectorSvg, onProgress, onMetrics:metrics=>console.log('Story render metrics',JSON.stringify(metrics)),
          timeoutMs, binary:process.env.FFMPEG_PATH || '/usr/bin/ffmpeg'})
      } catch (error) {
        if (controller.signal.aborted || error?.code === 'CANCELLED') throw error
        console.warn('FFmpeg Story failed; using Remotion compatibility render:',error)
        await renderRemotion()
      }
    } else {
      await renderRemotion()
    }
    if (controller.signal.aborted) throw controller.signal.reason
    if ((await stat(temporary)).size <= 1024) throw new RenderError('EMPTY_OUTPUT','Render produced an empty file')
    await rename(temporary, file)
    onProgress(1)
  } finally {
    clearTimeout(timer)
    controller.signal.removeEventListener('abort', onAbort)
    await rm(workDir, {recursive:true, force:true})
  }
}
async function serveExport(res, file, format, cachedResult) {
  const info = await stat(file)
  res.writeHead(200,{
    'content-type':format==='png'?'image/png':'video/mp4',
    'content-length':info.size,
    'cache-control':'private, max-age=300',
    'x-story-cache':cachedResult ? 'HIT' : 'MISS',
  })
  createReadStream(file).pipe(res)
}
function exportIdentity(request) {
  const {kind,designKey,patternKey,friendCount,slots,highlightSlot,format} = request
  const inputProps = {kind,designKey,patternKey,friendCount,slots,highlightSlot}
  const renderer = selectRenderer(format, mode, !!background && renderPreset === 'standard')
  const preset = format === 'png' ? 'high' : renderPreset
  const digest = renderDigest(compositionFor(inputProps,preset), sourceDigest, assetDigest, renderer + ':' + format)
  const file = path.join(renderDir,digest+(format==='png'?'.png':'.mp4'))
  return {inputProps,renderer,digest,file,format}
}

async function handleJobRequest(req,res) {
  const request = await readPayload(req,res)
  if (!request) return
  if (!valid(request) || request.format !== 'mp4') return respond(res,400,'Invalid Story job data')
  const {inputProps,digest,file} = exportIdentity(request)
  if (req.url === '/jobs') {
    if (busy) return respond(res,503,'Story renderer is busy. Retry shortly.')
    const cached = await cachedExport(file)
    const result = queue.submit(digest,file,async(signal,onProgress) => {
      const controller = new AbortController()
      const abort = () => controller.abort(new RenderError('CANCELLED','Story job cancelled'))
      signal.addEventListener('abort',abort,{once:true})
      try {
        await renderExport(file,'mp4',inputProps,controller,onProgress)
        await pruneExports(renderDir)
      }
      finally { signal.removeEventListener('abort',abort) }
    },{cached})
    if (!result) return respond(res,503,'Story render queue is full. Retry shortly.')
    res.writeHead(202,{'content-type':'application/json','cache-control':'no-store'})
    return res.end(JSON.stringify(result))
  }
  if (typeof request.id !== 'string' || !/^[0-9a-f-]{36}$/.test(request.id))
    return respond(res,400,'Invalid Story job identifier')
  const job = queue.describe(request.id)
  // Recomputing the digest from the authenticated backend snapshot binds every
  // operation to the current saved design, without publishing cache paths.
  if (!job || queue.handles.get(request.id)?.key !== digest) return respond(res,404,'Story job not found')
  if (req.url === '/jobs/status') {
    res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'})
    return res.end(JSON.stringify(job))
  }
  if (req.url === '/jobs/file') {
    const ready = queue.file(request.id)
    if (!ready || !(await cachedExport(ready))) return respond(res,409,'Story video is not ready')
    return serveExport(res,ready,'mp4',false)
  }
  if (req.url === '/jobs/cancel') {
    queue.cancel(request.id)
    return respond(res,200,'Story job cancelled')
  }
}
const server = http.createServer(async(req,res)=>{
  if (req.url === '/health' && req.method === 'GET') return respond(res,200,'ready')
  if (!['/render', '/render-parol','/jobs','/jobs/status','/jobs/file','/jobs/cancel'].includes(req.url) || req.method !== 'POST')
    return respond(res,404,'Not found')
  if (!authorized(req)) return respond(res,403,'Forbidden')
  if (req.url === '/render-parol') return await renderParolImage(req, res)
  if (req.url.startsWith('/jobs')) {
    try { return await handleJobRequest(req,res) }
    catch (error) { console.error('Story job request failed:',error); return respond(res,500,'Story job failed') }
  }
  let payload = ''
  try {
    for await (const chunk of req) {
      payload += chunk.toString('utf8')
      if (payload.length > 32_000) return respond(res,413,'Request too large')
    }
    const request = JSON.parse(payload)
    if (!valid(request)) return respond(res,400,'Invalid story data')
    // Only accept server-retrieved public fields, never a URL or HTML fragment.
    const {inputProps,digest,file,format} = exportIdentity(request)
    if (await cachedExport(file)) return await serveExport(res, file, format, true)
    let job = inFlight.get(digest)
    if (!job) {
      if (busy || queue.active > 0 || queue.pending.length > 0) {
        res.setHeader('Retry-After', '2')
        return respond(res,503,'Story renderer is busy. Retry shortly.')
      }
      busy = true
      const controller = new AbortController()
      job = {controller, waiters:0, promise:null}
      job.promise = renderExport(file, format, inputProps, controller)
        .finally(() => { inFlight.delete(digest); busy = false })
      inFlight.set(digest, job)
    }
    job.waiters++
    let released = false
    const release = () => {
      if (released) return
      released = true
      job.waiters--
      if (job.waiters === 0 && inFlight.has(digest)) job.controller.abort(new RenderError('CANCELLED','All clients disconnected'))
    }
    res.once('close', release)
    try {
      await job.promise
      if (!res.destroyed) await serveExport(res, file, format, false)
      void pruneExports(renderDir).catch(()=>{})
    } finally { res.off('close', release); release() }
  } catch(e) {
    console.error('Story render failed:',e)
    if (!res.headersSent) respond(res,500,'Unable to render story')
    else res.destroy()
  }
})
server.listen(port,'0.0.0.0',()=>console.log('Story renderer on '+port))
