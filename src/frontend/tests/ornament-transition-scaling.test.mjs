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

test('only existing large region motifs receive tangential scaling', () => {
  const renderer = readFileSync(
    new URL('../src/features/lantern/renderer/ProceduralOuterShell.tsx', import.meta.url),
    'utf8',
  )
  assert.ok(renderer.includes('ornamentWidthEmphasis(regionIndex)'))
  assert.ok(renderer.includes('scale(${fillSize * ornamentEmphasis} ${fillSize})'))
  assert.ok(renderer.includes('const fillSize = Math.min(3.1, Math.max(.55, (end - region.from + 1) * 10.5 / 39))'))
  assert.ok(renderer.includes('Array.from({ length: PANEL_SEGMENTS }'))
  assert.ok(renderer.includes('isFriendBoundary(n) && <path'))
  assert.ok(renderer.includes('ExtendedRegionMotif'))
})

test('reject invalid region indexes', () => {
  for (const n of [-1, 1.5, 15, NaN, Infinity]) {
    assert.throws(() => ornamentWidthEmphasis(n), RangeError)
  }
})
