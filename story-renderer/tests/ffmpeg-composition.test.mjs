import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import process from 'node:process'
import {compositionFor, renderDigest, OUTPUT} from '../composition.mjs'
import {ffmpegArgs, runFfmpeg, compatibleVideo} from '../ffmpegRenderer.mjs'

const design = {kind:'owner', designKey:'classic', patternKey:'default',
  friendCount:3, slots:[5,1,2], highlightSlot:null}

test('composition contains engine-neutral timing, layers and silent output contract', () => {
  const spec = compositionFor(design)
  assert.deepEqual(spec.design.slots, [5,1,2])
  assert.deepEqual(spec.timing.growthStages, [0,30,60,90])
  assert.deepEqual(spec.timing.flashes, [30,60,90])
  assert.equal(spec.output.width, 1080)
  assert.equal(spec.output.frames, 240)
  assert.equal(spec.audio, null)
  assert.equal(OUTPUT.pixelFormat, 'yuv420p')
})

test('content hash covers design, renderer, source, assets and settings', () => {
  const spec = compositionFor(design)
  const digest = renderDigest(spec, 'source-a', 'asset-a', 'ffmpeg:mp4')
  assert.notEqual(digest, renderDigest(compositionFor({...design, slots:[2,5,1]}),
    'source-a', 'asset-a', 'ffmpeg:mp4'))
  for (const changed of [
    renderDigest(compositionFor({...design, patternKey:'rays'}), 'source-a','asset-a','ffmpeg:mp4'),
    renderDigest(spec, 'source-b','asset-a','ffmpeg:mp4'),
    renderDigest(spec, 'source-a','asset-b','ffmpeg:mp4'),
    renderDigest(spec, 'source-a','asset-a','remotion:mp4'),
  ]) assert.notEqual(changed, digest)
})

test('FFmpeg uses argument arrays and browser-compatible bounded encoding', () => {
  const args = ffmpegArgs({background:'/a/background.mp4',
    stages:['/a/p0.png','/a/p1.png','/a/p2.png','/a/p3.png'],
    flashes:['/a/f0.png','/a/f1.png','/a/f2.png'], text:'/a/text.png',
    output:'/a/output.mp4'})
  assert.deepEqual(args.slice(-13), ['-c:v','libx264','-preset','veryfast','-crf','24',
    '-threads','2','-pix_fmt','yuv420p','-movflags','+faststart','/a/output.mp4'])
  assert.ok(args.includes('-an'))
  assert.equal(args.filter(x => x === '-i').length, 9)
  assert.ok(args.includes('-filter_complex_threads'))
})

test('FFmpeg launch failures are structured; no shell interprets paths', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ffmpeg-test-'))
  try {
    await assert.rejects(runFfmpeg(path.join(dir,'missing-binary'), ['file; touch /tmp/should-not-exist']),
      error => error.code === 'SPAWN')
  } finally { await rm(dir, {recursive:true, force:true}) }
})

test('a disconnected render aborts its child process', async () => {
  const controller = new AbortController()
  const running = runFfmpeg(process.execPath, ['-e', 'setTimeout(() => {}, 10000)'],
    {signal: controller.signal, timeoutMs: 20_000})
  setTimeout(() => controller.abort(), 30)
  await assert.rejects(running, error => error.code === 'CANCELLED')
})

test('only complete matching H.264 Stories pass media validation', () => {
  const metadata = {streams:[{codec_type:'video',codec_name:'h264',width:1080,
    height:1920,pix_fmt:'yuv420p',r_frame_rate:'30/1'}],format:{duration:'8.000000'}}
  assert.equal(compatibleVideo(metadata), true)
  assert.equal(compatibleVideo({...metadata, streams:[...metadata.streams,{codec_type:'audio'}]}), false)
  assert.equal(compatibleVideo({...metadata, format:{duration:'4.000000'}}), false)
  assert.equal(compatibleVideo({...metadata, streams:[{...metadata.streams[0],width:720}]}), false)
})
