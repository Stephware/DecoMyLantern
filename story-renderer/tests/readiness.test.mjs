import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp, mkdir, writeFile, rm, unlink} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {createRendererReadiness} from '../readiness.mjs'

async function fixture() {
  const dir = await mkdtemp(path.join(tmpdir(), 'parol-readiness-'))
  const bundlePath = path.join(dir, 'bundle')
  const renderDir = path.join(dir, 'exports')
  const imageDir = path.join(dir, 'images')
  const ffmpegPath = path.join(dir, 'ffmpeg')
  const ffprobePath = path.join(dir, 'ffprobe')
  const backgroundPath = path.join(dir, 'background.mp4')
  await Promise.all([mkdir(bundlePath), mkdir(renderDir), mkdir(imageDir)])
  await Promise.all([
    writeFile(ffmpegPath, '', {mode:0o755}),
    writeFile(ffprobePath, '', {mode:0o755}),
    writeFile(backgroundPath, 'valid-at-startup'),
  ])
  return {dir, bundlePath, renderDir, imageDir, ffmpegPath, backgroundPath}
}

test('readiness is healthy when required render paths and media tools are present', async () => {
  const f = await fixture()
  try {
    const report = await createRendererReadiness({...f, mode:'ffmpeg',
      optimizedAssetsReady:true, cacheMs:0})()
    assert.equal(report.status, 'ready')
    assert.equal(report.components.bundle, 'ready')
    assert.equal(report.components.outputStorage, 'ready')
    assert.equal(report.components.mediaTools, 'ready')
    assert.equal(report.components.optimizedVideo, 'ready')
  } finally { await rm(f.dir, {recursive:true,force:true}) }
})

test('missing optimized assets cause degraded fallback, not an unavailable service', async () => {
  const f = await fixture()
  try {
    await unlink(f.backgroundPath)
    const report = await createRendererReadiness({...f, mode:'ffmpeg',
      optimizedAssetsReady:true, cacheMs:0})()
    assert.equal(report.status, 'degraded')
    assert.equal(report.components.optimizedVideo, 'fallback')
    const remotion = await createRendererReadiness({...f, mode:'remotion',
      cacheMs:0})()
    assert.equal(remotion.status, 'ready')
    assert.equal(remotion.components.optimizedVideo, 'not_selected')
  } finally { await rm(f.dir,{recursive:true,force:true}) }
})

test('missing media tools or missing writable cache is unavailable', async () => {
  const f = await fixture()
  try {
    await unlink(path.join(f.dir, 'ffprobe'))
    const media = await createRendererReadiness({...f, cacheMs:0})()
    assert.equal(media.status, 'unavailable')
    assert.equal(media.components.mediaTools, 'unavailable')
    await rm(f.imageDir, {recursive:true,force:true})
    const storage = await createRendererReadiness({...f, cacheMs:0})()
    assert.equal(storage.components.outputStorage, 'unavailable')
  } finally { await rm(f.dir,{recursive:true,force:true}) }
})

test('repeated polls reuse checks for a short TTL and refresh after expiry', async () => {
  const f = await fixture()
  let ticks = 0
  let count = 0
  const {access} = await import('node:fs/promises')
  try {
    const probe = createRendererReadiness({...f, cacheMs:5000, now:() => ticks,
      checkAccess:async (...args) => { count++; return access(...args) }})
    const a = await probe()
    const firstCount = count
    const b = await probe()
    assert.equal(a, b)
    assert.equal(count, firstCount)
    ticks = 5001
    await probe()
    assert.ok(count > firstCount)
  } finally { await rm(f.dir,{recursive:true,force:true}) }
})
