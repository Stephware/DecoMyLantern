import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  BASE_FESTIVAL_RADIUS, FRIEND_LAYER_SPACING, FRIEND_BAND_GROWTH,
  GROWTH_REGIONS, PANEL_SEGMENTS, SIGNATURE_SECTORS,
  friendBandWidth, growthLayerWidth, growthForFriends,
  outerRadiusForFriends, ornamentScaleAtLayer,
  festivalPointAt, festivalMaxExtent, outerFitZoom,
} from '../src/features/lantern/growth/outerGrowth.ts'

const near = (actual, expected) => assert.ok(
  Math.abs(actual - expected) < 1e-8, `expected ${actual} to be near ${expected}`
)

test('balanced growth matches the agreed width and milestone geometry', () => {
  near(FRIEND_LAYER_SPACING, 10.5)
  near(FRIEND_BAND_GROWTH, .06)
  near(outerRadiusForFriends(0), BASE_FESTIVAL_RADIUS)
  for (const [friends, expected] of [
    [0, 164], [10, 271.7], [25, 444.5], [50, 762.5],
  ]) near(outerRadiusForFriends(growthForFriends(friends)), expected)

  for (let friend = 1; friend <= 50; friend++) {
    const start = growthForFriends(friend - 1)
    const end = growthForFriends(friend)
    const width = outerRadiusForFriends(end) - outerRadiusForFriends(start)
    near(width, friendBandWidth(friend))
    for (let wave = 1; wave <= 3; wave++)
      near(growthLayerWidth(start + wave), friendBandWidth(friend) / 3)
    if (friend > 1) assert.ok(width > friendBandWidth(friend - 1))
  }
})

test('the fifteen original decorative regions retain the exact layer thresholds', () => {
  assert.deepEqual(GROWTH_REGIONS.map(({from,to}) => [from,to]), [
    [1,10], [11,20], [21,35], [36,45], [46,50],
    [51,60], [61,70], [71,80], [81,90], [91,100],
    [101,110], [111,120], [121,130], [131,140], [141,150],
  ])
  assert.equal(SIGNATURE_SECTORS, 10)
  assert.equal(PANEL_SEGMENTS, 20)
})

test('ornament size increases per friend and gains regional emphasis', () => {
  for (let n = 2; n <= 150; n++) {
    assert.ok(ornamentScaleAtLayer(n) >= ornamentScaleAtLayer(n - 1))
  }
  for (const region of GROWTH_REGIONS.slice(1)) {
    const jump = ornamentScaleAtLayer(region.from) /
      ornamentScaleAtLayer(region.from - 1)
    assert.ok(jump > 1.049, `region ${region.zone} failed scale jump`)
  }
  assert.ok(ornamentScaleAtLayer(150) > ornamentScaleAtLayer(1) * 2.5)
})

test('all 150 nested layer outlines remain separate and fit the scene', () => {
  for (let n = 1; n <= 150; n++) {
    for (let step = 0; step < 360; step += 3) {
      const angle = step * Math.PI / 180
      const before = festivalPointAt(n - 1, angle)
      const after = festivalPointAt(n, angle)
      const radiusBefore = Math.hypot(before.x - 300, before.y - 302)
      const radiusAfter = Math.hypot(after.x - 300, after.y - 302)
      assert.ok(radiusAfter > radiusBefore,
        `contours crossed at layer ${n}, angle ${angle}`)
    }
  }
  for (const n of [0, 1, 10, 30, 75, 150]) {
    assert.ok(festivalMaxExtent(n) * outerFitZoom(n) < 281)
  }
})

test('the region renderer draws clipped signatures and the Story shares its geometry', () => {
  const renderer = readFileSync(
    new URL('../src/features/lantern/renderer/ProceduralOuterShell.tsx', import.meta.url), 'utf8')
  const story = readFileSync(
    new URL('../src/features/story/StoryFrame.tsx', import.meta.url), 'utf8')
  assert.ok(renderer.includes('Array.from({ length: SIGNATURE_SECTORS }'))
  assert.ok(renderer.includes('data-signature-ornament={sector}'))
  assert.ok(renderer.includes('clipPathUnits="userSpaceOnUse"'))
  assert.ok(renderer.includes('ornamentScaleAtLayer(end)'))
  assert.ok(story.includes('<ProceduralOuterShell'))
  assert.ok(story.includes('outerFitZoom(count)'))
})

test('reject invalid friend and wave indices', () => {
  for (const value of [-1, 0, 1.5, NaN, Infinity]) {
    assert.throws(() => friendBandWidth(value), RangeError)
    assert.throws(() => growthLayerWidth(value), RangeError)
    assert.throws(() => ornamentScaleAtLayer(value), RangeError)
  }
})
