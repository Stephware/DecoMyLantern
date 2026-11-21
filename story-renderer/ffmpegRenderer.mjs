import {spawn} from 'node:child_process'
import {mkdir, stat} from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import {compositionFor, OUTPUT, PRESETS, STAGES, FLASHES, TIMING, frameAt} from './composition.mjs'

sharp.concurrency(2)
sharp.cache(false)

export class RenderError extends Error {
  constructor(code, message, cause) { super(message, {cause}); this.name = 'RenderError'; this.code = code }
}

export function ffmpegArgs({background, stages, flashes, text, output, preset = 'standard'}) {
  const spec = PRESETS[preset]
  if (!spec) throw new RangeError('Unknown Story preset')
  const inputs = ['-i', background]
  for (const file of [...stages, ...flashes, text])
    inputs.push('-loop', '1', '-framerate', String(spec.fps), '-i', file)
  const filters = []
  const zoom = `${TIMING.zoom.from}+(${TIMING.zoom.to-TIMING.zoom.from})*min(1,max(0,(n/${spec.fps}-${TIMING.zoom.start})/${TIMING.zoom.end-TIMING.zoom.start}))`
  const scale = `scale=w='trunc(iw*(${zoom})/2)*2':h='trunc(ih*(${zoom})/2)*2':eval=frame`
  for (let i = 0; i < stages.length; i++) {
    filters.push(`[${i + 1}:v]format=rgba,${scale},` +
      `fade=t=in:st=${TIMING.parolFade[0]}:d=${TIMING.parolFade[1]-TIMING.parolFade[0]}:alpha=1[p${i}]`)
  }
  for (let i = 0; i < flashes.length; i++) {
    const start = FLASHES[i]
    filters.push(`[${i + 5}:v]format=rgba,${scale},` +
      `fade=t=out:st=${start}:d=${TIMING.flashDuration}:alpha=1[f${i}]`)
  }
  filters.push(`[8:v]format=rgba,fade=t=in:st=${TIMING.textFade[0]}:d=${TIMING.textFade[1]-TIMING.textFade[0]}:alpha=1[text]`)
  let current = '0:v'
  let next = 0
  const overlay = (layer, enable) => {
    const dest = `v${next++}`
    filters.push(`[${current}][${layer}]overlay=x=(W-w)/2:y=${TIMING.parolCenterY}*H-h/2:` +
      `enable='${enable}':eof_action=repeat:shortest=1[${dest}]`)
    current = dest
  }
  for (let i = 0; i < STAGES.length; i++)
    overlay(`p${i}`, `between(n,${frameAt(STAGES[i],spec)},${frameAt(STAGES[i + 1] ?? spec.duration,spec) - 1})`)
  for (let i = 0; i < FLASHES.length; i++)
    overlay(`f${i}`, `between(n,${frameAt(FLASHES[i],spec)},${Math.min(frameAt(FLASHES[i]+TIMING.flashDuration,spec)-1, frameAt(FLASHES[i + 1] ?? spec.duration,spec)-1)})`)
  const dest = `v${next++}`
  filters.push(`[${current}][text]overlay=x=0:y=0:eof_action=repeat:shortest=1[${dest}]`)
  return ['-hide_banner', '-loglevel', 'error', '-y', '-filter_complex_threads', '2',
    ...inputs, '-filter_complex', filters.join(';'), '-map', `[${dest}]`,
    '-an', '-frames:v', String(spec.frames), '-r', String(spec.fps),
    '-c:v', spec.codec, '-preset', spec.preset, '-crf', String(spec.crf),
    '-threads', '2', '-pix_fmt', spec.pixelFormat, '-movflags', '+faststart', output]
}

export function runFfmpeg(binary, args, {signal, timeoutMs = 180_000} = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {stdio: ['ignore', 'ignore', 'pipe'], signal})
    let errorText = ''
    child.stderr.on('data', chunk => { errorText = (errorText + chunk).slice(-8192) })
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
    child.once('error', err => { clearTimeout(timer); reject(new RenderError(
      signal?.aborted ? 'CANCELLED' : 'SPAWN',
      signal?.aborted ? 'FFmpeg was cancelled' : 'FFmpeg could not start', err)) })
    child.once('close', (code, sig) => {
      clearTimeout(timer)
      if (code === 0) resolve()
      else reject(new RenderError(signal?.aborted ? 'CANCELLED' : sig === 'SIGKILL' ? 'TIMEOUT' : 'FFMPEG',
        `FFmpeg exited ${code ?? sig}: ${errorText}`))
    })
  })
}

export function compatibleVideo(metadata, preset = 'standard') {
  const spec = PRESETS[preset]
  if (!spec) return false
  const video = metadata.streams?.find(stream => stream.codec_type === 'video')
  return video?.codec_name === 'h264' && video.width === spec.width &&
    video.height === spec.height && video.pix_fmt === spec.pixelFormat &&
    video.r_frame_rate === `${spec.fps}/1` &&
    !metadata.streams?.some(stream => stream.codec_type === 'audio') &&
    Math.abs(Number(metadata.format?.duration) - spec.duration) < 0.05
}

export function probeVideo(binary, file, {signal} = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, ['-v', 'error', '-show_entries',
      'stream=codec_type,codec_name,width,height,pix_fmt,r_frame_rate:format=duration',
      '-of', 'json', file], {stdio:['ignore','pipe','pipe'], signal})
    let output = ''
    let errors = ''
    child.stdout.on('data', chunk => { output = (output + chunk).slice(-16_384) })
    child.stderr.on('data', chunk => { errors = (errors + chunk).slice(-4096) })
    child.once('error', error => reject(new RenderError(signal?.aborted ? 'CANCELLED' : 'PROBE',
      'FFprobe could not start', error)))
    child.once('close', code => {
      if (code !== 0) return reject(new RenderError('PROBE', `FFprobe failed: ${errors}`))
      try { resolve(JSON.parse(output)) }
      catch (error) { reject(new RenderError('PROBE', 'FFprobe returned invalid JSON', error)) }
    })
  })
}

export async function renderFfmpeg({serveUrl, renderStill, selectComposition, openBrowser, inputProps,
  background, workDir, output, signal, cancelSignal, vectorSvg,
  preset = 'standard', binary = 'ffmpeg', timeoutMs, onProgress = () => {},
  onMetrics = () => {}}) {
  if (signal?.aborted) throw new RenderError('CANCELLED', 'Render cancelled')
  const started = performance.now()
  await mkdir(workDir, {recursive: true})
  const spec = PRESETS[preset]
  if (!spec) throw new RenderError('PRESET','Unknown Story preset')
  const specification = compositionFor(inputProps,preset)
  const still = async (sourceFrame, name, browser) => {
    if (signal?.aborted) throw new RenderError('CANCELLED', 'Render cancelled')
    const file = path.join(workDir, `${name}.png`)
    const props = {...inputProps, layer:'text', sourceFrame}
    const composition = await selectComposition({serveUrl, id: 'BeMyParolStoryLayer',
      inputProps: props,puppeteerInstance:browser})
    await renderStill({composition, serveUrl, output: file, inputProps: props,
      frame: sourceFrame, imageFormat: 'png', cancelSignal,puppeteerInstance:browser})
    if ((await stat(file)).size < 100) throw new RenderError('EMPTY_LAYER', `Empty ${name} layer`)
    return file
  }
  const vector = async (layer, second, name) => {
    if (signal?.aborted) throw new RenderError('CANCELLED','Render cancelled')
    const file = path.join(workDir, `${name}.png`)
    const svg = vectorSvg(inputProps, frameAt(second,spec), layer, preset)
    await sharp(Buffer.from(svg), {density:96}).resize({width:Math.round(840*spec.width/1080),
      height:Math.round(890*spec.height/1920),fit:'fill'}).png().toFile(file)
    if ((await stat(file)).size < 100) throw new RenderError('EMPTY_LAYER',`Empty ${name} layer`)
    return file
  }
  const stages = []
  for (const second of STAGES) { stages.push(await vector('parol',second,`parol-${second}`)); onProgress(.1+.08*stages.length) }
  const flashes = []
  for (const second of FLASHES) flashes.push(await vector('flash',second,`flash-${second}`))
  const vectorsDone = performance.now()
  const browser = await openBrowser('chrome',{})
  const browserReady = performance.now()
  let text
  try { text = await still(frameAt(200/30,spec), 'text',browser) }
  finally { await browser.close({silent:true}) }
  const textDone = performance.now()
  onProgress(.5)
  if (signal?.aborted) throw new RenderError('CANCELLED', 'Render cancelled')
  await runFfmpeg(binary, ffmpegArgs({background, stages, flashes, text, output, preset}), {signal, timeoutMs})
  const encoded = performance.now()
  onProgress(.95)
  if ((await stat(output)).size < 1024) throw new RenderError('EMPTY_OUTPUT', 'FFmpeg produced an empty video')
  const metadata = await probeVideo(binary.replace(/ffmpeg$/, 'ffprobe'), output, {signal})
  if (!compatibleVideo(metadata,preset)) throw new RenderError('INVALID_OUTPUT', 'FFmpeg output failed media validation')
  onMetrics({vectorMs:Math.round(vectorsDone-started),
    chromiumInitMs:Math.round(browserReady-vectorsDone),
    chromiumCaptureMs:Math.round(textDone-browserReady),ffmpegMs:Math.round(encoded-textDone),
    totalMs:Math.round(performance.now()-started),chromiumCaptures:1,
    vectorRasters:STAGES.length+FLASHES.length})
  return specification
}
