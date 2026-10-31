import {spawn} from 'node:child_process'
import {mkdir, stat} from 'node:fs/promises'
import path from 'node:path'
import {compositionFor, OUTPUT, STAGES, FLASHES} from './composition.mjs'

export class RenderError extends Error {
  constructor(code, message, cause) { super(message, {cause}); this.name = 'RenderError'; this.code = code }
}

export function ffmpegArgs({background, stages, flashes, text, output}) {
  const inputs = ['-i', background]
  for (const file of [...stages, ...flashes, text])
    inputs.push('-loop', '1', '-framerate', String(OUTPUT.fps), '-i', file)
  const filters = []
  // Chromium rasterizes each distinct design stage once. FFmpeg applies the
  // original camera curve to the transparent crops on every output frame.
  const zoom = '1.12-0.12*min(1,max(0,(n-96)/55))'
  const scale = `scale=w='trunc(840*(${zoom})/2)*2':h='trunc(890*(${zoom})/2)*2':eval=frame`
  for (let i = 0; i < stages.length; i++) {
    filters.push(`[${i + 1}:v]crop=840:890:120:325,format=rgba,${scale},` +
      `fade=t=in:st=${4 / 30}:d=${22 / 30}:alpha=1[p${i}]`)
  }
  for (let i = 0; i < flashes.length; i++) {
    const start = FLASHES[i]
    filters.push(`[${i + 5}:v]crop=840:890:120:325,format=rgba,${scale},` +
      `fade=t=out:st=${start / 30}:d=${25 / 30}:alpha=1[f${i}]`)
  }
  filters.push(`[8:v]format=rgba,fade=t=in:st=${155 / 30}:d=${26 / 30}:alpha=1[text]`)
  let current = '0:v'
  let next = 0
  const overlay = (layer, enable) => {
    const dest = `v${next++}`
    filters.push(`[${current}][${layer}]overlay=x=(W-w)/2:y=770-h/2:` +
      `enable='${enable}':eof_action=repeat:shortest=1[${dest}]`)
    current = dest
  }
  for (let i = 0; i < STAGES.length; i++)
    overlay(`p${i}`, `between(n,${STAGES[i]},${(STAGES[i + 1] ?? OUTPUT.frames) - 1})`)
  for (let i = 0; i < FLASHES.length; i++)
    overlay(`f${i}`, `between(n,${FLASHES[i]},${Math.min(FLASHES[i] + 24, (FLASHES[i + 1] ?? OUTPUT.frames) - 1)})`)
  const dest = `v${next++}`
  filters.push(`[${current}][text]overlay=x=0:y=0:eof_action=repeat:shortest=1[${dest}]`)
  return ['-hide_banner', '-loglevel', 'error', '-y', '-filter_complex_threads', '2',
    ...inputs, '-filter_complex', filters.join(';'), '-map', `[${dest}]`,
    '-an', '-frames:v', String(OUTPUT.frames), '-r', String(OUTPUT.fps),
    '-c:v', OUTPUT.codec, '-preset', OUTPUT.preset, '-crf', String(OUTPUT.crf),
    '-threads', '2', '-pix_fmt', OUTPUT.pixelFormat, '-movflags', '+faststart', output]
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

export function compatibleVideo(metadata) {
  const video = metadata.streams?.find(stream => stream.codec_type === 'video')
  return video?.codec_name === 'h264' && video.width === OUTPUT.width &&
    video.height === OUTPUT.height && video.pix_fmt === OUTPUT.pixelFormat &&
    video.r_frame_rate === `${OUTPUT.fps}/1` &&
    !metadata.streams?.some(stream => stream.codec_type === 'audio') &&
    Math.abs(Number(metadata.format?.duration) - OUTPUT.frames / OUTPUT.fps) < 0.05
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

export async function renderFfmpeg({serveUrl, renderStill, selectComposition, inputProps,
  background, workDir, output, signal, cancelSignal, binary = 'ffmpeg', timeoutMs}) {
  if (signal?.aborted) throw new RenderError('CANCELLED', 'Render cancelled')
  await mkdir(workDir, {recursive: true})
  const specification = compositionFor(inputProps)
  const still = async (layer, sourceFrame, name) => {
    if (signal?.aborted) throw new RenderError('CANCELLED', 'Render cancelled')
    const file = path.join(workDir, `${name}.png`)
    const props = {...inputProps, layer, sourceFrame}
    const composition = await selectComposition({serveUrl, id: 'BeMyParolStoryLayer', inputProps: props})
    await renderStill({composition, serveUrl, output: file, inputProps: props,
      frame: sourceFrame, imageFormat: 'png', cancelSignal})
    if ((await stat(file)).size < 100) throw new RenderError('EMPTY_LAYER', `Empty ${name} layer`)
    return file
  }
  const stages = []
  for (const frame of STAGES) stages.push(await still('parol', frame, `parol-${frame}`))
  const flashes = []
  for (const frame of FLASHES) flashes.push(await still('flash', frame, `flash-${frame}`))
  const text = await still('text', 200, 'text')
  if (signal?.aborted) throw new RenderError('CANCELLED', 'Render cancelled')
  await runFfmpeg(binary, ffmpegArgs({background, stages, flashes, text, output}), {signal, timeoutMs})
  if ((await stat(output)).size < 1024) throw new RenderError('EMPTY_OUTPUT', 'FFmpeg produced an empty video')
  const metadata = await probeVideo(binary.replace(/ffmpeg$/, 'ffprobe'), output, {signal})
  if (!compatibleVideo(metadata)) throw new RenderError('INVALID_OUTPUT', 'FFmpeg output failed media validation')
  return specification
}
