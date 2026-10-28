import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  NEXT_ORNAMENT_SIZE_STEP,
  ornamentWidthEmphasis,
} from '../src/features/lantern/growth/ornamentScaling.ts'
import {
  BASE_FESTIVAL_RADIUS,
  FRIEND_LAYER_SPACING,
  GROWTH_REGIONS,
  PANEL_SEGMENTS,
  growthLayerSpacing,
  growthForFriends,
  outerRadiusForFriends,
  isFriendBoundary,
} from '../src/features/lantern/growth/outerGrowth.ts'

test('only completed ornament-design transitions increase visual emphasis by 6%', () => {
  assert.equal(GROWTH_REGIONS.length, 15)
  assert.equal(NEXT_ORNAMENT_SIZE_STEP, 1.06)
  assert.equal(ornamentWidthEmphasis(0), 1)
  for (let index = 1; index < GROWTH_REGIONS.length; index++) {
    const ratio = ornamentWidthEmphasis(index) / ornamentWidthEmphasis(index - 1)
    assert.ok(Math.abs(ratio - 1.06) < 1e-10, `region ${index} should grow 6%`)
  }
})

test('original three-wave structure and twenty facets remain while region depth expands', () => {
  assert.equal(BASE_FESTIVAL_RADIUS, 164)
  assert.equal(FRIEND_LAYER_SPACING, 10.5)
  assert.equal(PANEL_SEGMENTS, 20)
  for (let friend = 0; friend <= 50; friend++) {
    const count = growthForFriends(friend)
    assert.equal(count, friend * 3)
    if (count > 0) assert.ok(outerRadiusForFriends(count) > outerRadiusForFriends(count - 1))
    assert.ok(outerRadiusForFriends(count) >= 164 + 10.5 * count - 1e-8)
    if (friend) {
      assert.equal(isFriendBoundary(count), true)
      assert.equal(isFriendBoundary(count - 1), false)
    }
  }
})

test('only existing large region motifs are uniformly scaled', () => {
  const renderer = readFileSync(
    new URL('../src/features/lantern/renderer/ProceduralOuterShell.tsx', import.meta.url),
    'utf8',
  )
  assert.ok(renderer.includes('ornamentWidthEmphasis(regionIndex)'))
  assert.ok(renderer.includes('scale(${fillSize * ornamentEmphasis})'))
  assert.ok(renderer.includes('const fillSize = Math.min(3.1, Math.max(.55, (end - region.from + 1) * 10.5 / 39))'))
  assert.ok(renderer.includes('Array.from({ length: PANEL_SEGMENTS }'))
  assert.ok(renderer.includes('isFriendBoundary(n) && <path'))
  assert.ok(renderer.includes('ExtendedRegionMotif'))
  for (const [i, region] of GROWTH_REGIONS.entries()) {
    const expected = FRIEND_LAYER_SPACING * ornamentWidthEmphasis(i)
    assert.ok(Math.abs(growthLayerSpacing(region.from) - expected) < 1e-9)
  }
})

test('each decorative region has 6% more radial room with no gaps', () => {
  assert.deepEqual(GROWTH_REGIONS.map(({ from, to }) => [from, to]), [
    [1, 10], [11, 20], [21, 35], [36, 45], [46, 50],
    [51, 60], [61, 70], [71, 80], [81, 90], [91, 100],
    [101, 110], [111, 120], [121, 130], [131, 140], [141, 150],
  ])
  let previousSpacing = 0
  for (let layer = 1; layer <= 165; layer++) {
    const spacing = growthLayerSpacing(layer)
    const actual = outerRadiusForFriends(layer) - outerRadiusForFriends(layer - 1)
    assert.ok(Math.abs(actual - spacing) < 1e-8, `gap at layer ${layer}`)
    assert.ok(spacing >= previousSpacing, `layer ${layer} must not shrink`)
    previousSpacing = spacing
  }
  for (let regionIndex = 1; regionIndex < GROWTH_REGIONS.length; regionIndex++) {
    const current = GROWTH_REGIONS[regionIndex].from
    const increase = growthLayerSpacing(current) / growthLayerSpacing(current - 1)
    assert.ok(Math.abs(increase - 1.06) < 1e-10)
  }
})

test('both website and Story reuse the same new region geometry', () => {
  const story = readFileSync(
    new URL('../src/features/story/StoryFrame.tsx', import.meta.url), 'utf8',
  )
  assert.ok(story.includes('<ProceduralOuterShell'))
  assert.ok(story.includes('outerFitZoom(count)'))
  assert.ok(outerRadiusForFriends(150) > BASE_FESTIVAL_RADIUS + 150 * FRIEND_LAYER_SPACING)
})

test('reject invalid region indexes', () => {
  for (const n of [-1, 1.5, 15, NaN, Infinity]) {
    assert.throws(() => ornamentWidthEmphasis(n), RangeError)
  }
})
