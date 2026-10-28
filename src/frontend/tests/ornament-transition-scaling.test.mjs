import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  NEXT_ORNAMENT_SIZE_STEP,
  ornamentWidthEmphasis,
  FLOWER_VISUAL_RADIUS,
  FLOWER_REGION_INDEX,
  REGION_MOTIF_EXTENTS,
  completedMotifVisualRadius,
  laterMotifScale,
  LATER_ORNAMENT_SIZE_STEP,
} from '../src/features/lantern/growth/ornamentScaling.ts'
import {
  BASE_FESTIVAL_RADIUS,
  FRIEND_LAYER_SPACING,
  GROWTH_REGIONS,
  PANEL_SEGMENTS,
  growthForFriends,
  outerRadiusForFriends,
  outerFitZoom,
  festivalMaxExtent,
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

test('original 3-wave layer structure, widths, radius and 20 glass facets remain unchanged', () => {
  assert.equal(BASE_FESTIVAL_RADIUS, 164)
  assert.equal(FRIEND_LAYER_SPACING, 10.5)
  assert.equal(PANEL_SEGMENTS, 20)
  for (let friend = 0; friend <= 50; friend++) {
    const count = growthForFriends(friend)
    assert.equal(count, friend * 3)
    assert.equal(outerRadiusForFriends(count), 164 + 10.5 * count)
    if (friend) {
      assert.equal(isFriendBoundary(count), true)
      assert.equal(isFriendBoundary(count - 1), false)
    }
  }
})

test('early region decorations are preserved and later region motifs grow proportionally', () => {
  const renderer = readFileSync(
    new URL('../src/features/lantern/renderer/ProceduralOuterShell.tsx', import.meta.url),
    'utf8',
  )
  assert.ok(renderer.includes('ornamentWidthEmphasis(regionIndex)'))
  assert.ok(renderer.includes('scale(${fillSize * ornamentEmphasis})'))
  assert.ok(renderer.includes('const afterFlower = regionIndex > FLOWER_REGION_INDEX'))
  assert.ok(renderer.includes('laterMotifScale(regionIndex) * growthFraction'))
  assert.ok(renderer.includes("outerDetail ? '.19' : '.37'"))
  assert.ok(renderer.includes(': Math.min(3.1, Math.max(.55, (end - region.from + 1) * 10.5 / 39))'))
  assert.ok(renderer.includes('Array.from({ length: PANEL_SEGMENTS }'))
  assert.ok(renderer.includes('isFriendBoundary(n) && <path'))
  assert.ok(renderer.includes('ExtendedRegionMotif'))
})

test('completed ornaments after the flower become genuinely larger regardless of shape', () => {
  assert.equal(FLOWER_REGION_INDEX, 2)
  assert.equal(REGION_MOTIF_EXTENTS.length, GROWTH_REGIONS.length)
  assert.ok(FLOWER_VISUAL_RADIUS > 120)
  assert.equal(LATER_ORNAMENT_SIZE_STEP, 1.08)
  for (let regionIndex = 3; regionIndex < GROWTH_REGIONS.length; regionIndex++) {
    const preceding = completedMotifVisualRadius(regionIndex - 1)
    const current = completedMotifVisualRadius(regionIndex)
    assert.ok(current > preceding,
      `region ${GROWTH_REGIONS[regionIndex].zone} should be larger than its predecessor`)
    assert.ok(Math.abs(current / preceding - LATER_ORNAMENT_SIZE_STEP) < 1e-10)
    assert.ok(Math.abs(laterMotifScale(regionIndex) * REGION_MOTIF_EXTENTS[regionIndex] -
      current) < 1e-10)
  }
})

test('original radial band width is restored, avoiding a huge striped circle', () => {
  for (let layer = 0; layer <= 150; layer++) {
    assert.equal(outerRadiusForFriends(layer), BASE_FESTIVAL_RADIUS + layer * FRIEND_LAYER_SPACING)
  }
  assert.equal(outerRadiusForFriends(150), 1739)
  // The last outer petals remain prominent at Fit zoom and are not clipped.
  assert.ok(completedMotifVisualRadius(14) * outerFitZoom(150) > 40)
  assert.ok(festivalMaxExtent(150) * outerFitZoom(150) < 281)
  assert.ok(festivalMaxExtent(150) > outerRadiusForFriends(150) + 52)
})

test('reject invalid region indexes', () => {
  for (const n of [-1, 1.5, 15, NaN, Infinity]) {
    assert.throws(() => ornamentWidthEmphasis(n), RangeError)
  }
})
