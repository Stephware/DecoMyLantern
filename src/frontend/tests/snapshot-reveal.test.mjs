import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {STEP_DURATIONS_MS} from '../src/features/lantern/growth/reveal.ts'
import {
  shouldAnimateSnapshot, SNAPSHOT_WAVE_DURATIONS_MS,
  SNAPSHOT_WAVE_LABEL, SNAPSHOT_WAVE_RADIUS,
} from '../src/features/lantern/renderer/snapshotReveal.ts'

const oldImage = {
  source:'owner:lantern-1', designKey:'classic', patternKey:'default', friendCount:10,
}
const newImage = {...oldImage, friendCount:11}
const defaultSettings = {
  hidden:false, reducedMotion:false, recentlyReturned:false, alreadyAnimating:false,
}

test('one newly accepted friend triggers three image waves, preserving original timing', () => {
  assert.equal(shouldAnimateSnapshot(oldImage, newImage, defaultSettings), true)
  assert.deepEqual(SNAPSHOT_WAVE_DURATIONS_MS, STEP_DURATIONS_MS)
  assert.deepEqual(SNAPSHOT_WAVE_DURATIONS_MS, [750, 850, 1100])
  assert.equal(SNAPSHOT_WAVE_DURATIONS_MS.reduce((sum, ms) => sum + ms, 0), 2700)
  assert.ok(SNAPSHOT_WAVE_RADIUS[1] < SNAPSHOT_WAVE_RADIUS[2])
  assert.ok(SNAPSHOT_WAVE_RADIUS[2] < SNAPSHOT_WAVE_RADIUS[3])
  assert.ok(SNAPSHOT_WAVE_RADIUS[3] >= 80, 'final wave reveals full fitted parol')
  assert.equal(Object.keys(SNAPSHOT_WAVE_LABEL).length, 3)
})

test('skip animation for reload, theme changes, multi-friend catchup and other parols', () => {
  assert.equal(shouldAnimateSnapshot(null, newImage, defaultSettings), false)
  assert.equal(shouldAnimateSnapshot(oldImage, oldImage, defaultSettings), false)
  assert.equal(shouldAnimateSnapshot(oldImage, {...newImage, friendCount:12}, defaultSettings), false)
  assert.equal(shouldAnimateSnapshot(oldImage, {...newImage, source:'guest:new-invitation'}, defaultSettings), false)
  assert.equal(shouldAnimateSnapshot(oldImage, {...newImage, designKey:'floral'}, defaultSettings), false)
  assert.equal(shouldAnimateSnapshot(oldImage, {...newImage, patternKey:'rays'}, defaultSettings), false)
  assert.equal(shouldAnimateSnapshot(newImage, oldImage, defaultSettings), false)
})

test('respect hidden tabs, return-from-background and reduced-motion preferences', () => {
  for (const setting of Object.keys(defaultSettings)) {
    assert.equal(shouldAnimateSnapshot(oldImage, newImage,
      {...defaultSettings, [setting]:true}), false, setting)
  }
})

test('frontend animates the SINGLE completed cached image and never rebuilds SVG', () => {
  const viewer = readFileSync(
    new URL('../src/features/lantern/renderer/CachedParolScene.tsx', import.meta.url), 'utf8')
  const style = readFileSync(
    new URL('../src/styles/index.css', import.meta.url), 'utf8')
  assert.ok(viewer.includes('shouldAnimateSnapshot(previous, next'))
  assert.ok(viewer.includes('img.decode()'))
  assert.ok(viewer.includes('SNAPSHOT_WAVE_DURATIONS_MS[transition.wave - 1]'))
  assert.ok(viewer.includes('SNAPSHOT_WAVE_RADIUS[activeWave.wave]'))
  assert.ok(viewer.includes('setRendered(transition.next)'))
  assert.ok(viewer.includes('URL.revokeObjectURL(url)'))
  assert.ok(viewer.includes('controller.abort()'))
  assert.ok(viewer.includes("snapshot.kind === 'guest' ? snapshot.token"))
  assert.ok(viewer.includes('visibleImage && <img src={visibleImage.url}'))
  assert.ok(viewer.includes('activeWave && <>'))
  assert.ok(viewer.includes('<img src={activeWave.next.url}'))
  assert.ok(!viewer.includes('<ProceduralOuterShell'))
  assert.ok(!viewer.includes('<ParolArtwork'))
  assert.ok(style.includes('.parol-snapshot-wave-reveal'))
  assert.ok(style.includes('@media (prefers-reduced-motion: reduce)'))
})
