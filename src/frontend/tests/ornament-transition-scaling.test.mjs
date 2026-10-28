import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  NEXT_ORNAMENT_SIZE_STEP, ornamentWidthEmphasis, FLOWER_REGION_INDEX,
  FLOWER_REFERENCE_RADIUS, POST_FLOWER_SIZE_STEP, POST_FLOWER_CLEARANCE,
  REGION_MOTIF_RADIUS, completedOrnamentRadius,
  completedOuterOrnamentScale, minimumOuterRegionDepth,
} from '../src/features/lantern/growth/ornamentScaling.ts'
import {
  BASE_FESTIVAL_RADIUS, FRIEND_LAYER_SPACING, GROWTH_REGIONS,
  PANEL_SEGMENTS, growthLayerSpacing, growthForFriends,
  outerRadiusForFriends, outerFitZoom, festivalPointAt, isFriendBoundary,
} from '../src/features/lantern/growth/outerGrowth.ts'

const near = (actual, expected, message = '') =>
  assert.ok(Math.abs(actual - expected) < 1e-8, `${message}: ${actual} vs ${expected}`)

test('flower is the unchanged reference for all later ornaments', () => {
  assert.equal(GROWTH_REGIONS[FLOWER_REGION_INDEX].zone, 'palimbun')
  near(FLOWER_REFERENCE_RADIUS, 37 * 3.1 * (1.06 ** 2))
  near(completedOrnamentRadius(FLOWER_REGION_INDEX), FLOWER_REFERENCE_RADIUS)
  assert.equal(REGION_MOTIF_RADIUS.length, GROWTH_REGIONS.length)
  assert.equal(POST_FLOWER_SIZE_STEP, 1.07)
  assert.equal(POST_FLOWER_CLEARANCE, 1.10)
  // The first three regions' exact old geometry remains unchanged.
  for (let n = 0; n <= 35; n++) {
    let expected = BASE_FESTIVAL_RADIUS
    for (let i = 0; i <= FLOWER_REGION_INDEX; i++) {
      const region = GROWTH_REGIONS[i]
      expected += Math.max(0, Math.min(n, region.to) - region.from + 1) *
        FRIEND_LAYER_SPACING * ornamentWidthEmphasis(i)
    }
    near(outerRadiusForFriends(n), expected)
  }
})

test('each completed ornament after the flower has a larger actual visual radius', () => {
  assert.equal(NEXT_ORNAMENT_SIZE_STEP, 1.06)
  for (let i = FLOWER_REGION_INDEX + 1; i < GROWTH_REGIONS.length; i++) {
    const previous = completedOrnamentRadius(i - 1)
    const current = completedOrnamentRadius(i)
    assert.ok(current > previous, `${GROWTH_REGIONS[i].zone} must exceed the flower and preceding ornament`)
    near(current / previous, POST_FLOWER_SIZE_STEP)
    near(completedOuterOrnamentScale(i) * REGION_MOTIF_RADIUS[i], current)
  }
})

test('later ornamental regions provide actual radial room for their larger motifs', () => {
  assert.deepEqual(GROWTH_REGIONS.map(({ from, to }) => [from, to]), [
    [1, 10], [11, 20], [21, 35], [36, 45], [46, 50],
    [51, 60], [61, 70], [71, 80], [81, 90], [91, 100],
    [101, 110], [111, 120], [121, 130], [131, 140], [141, 150],
  ])
  let previousTotalDepth = 0
  for (const [i, region] of GROWTH_REGIONS.entries()) {
    const width = outerRadiusForFriends(region.to) -
      outerRadiusForFriends(region.from - 1)
    near(width, (region.to - region.from + 1) * growthLayerSpacing(region.from))
    if (i > FLOWER_REGION_INDEX) {
      assert.ok(width >= minimumOuterRegionDepth(i) - 1e-8)
      assert.ok(width > previousTotalDepth,
        `completed region ${region.zone} should be deeper than preceding region`)
      // Motif growing from the first wave is contained within that wave;
      // completed motif fits with ten percent radial breathing room.
      for (let end = region.from; end <= region.to; end++) {
        const completion = (end - region.from + 1) / (region.to - region.from + 1)
        const filledDepth = outerRadiusForFriends(end) -
          outerRadiusForFriends(region.from - 1)
        assert.ok(2 * completedOrnamentRadius(i) * completion <
          filledDepth + 1e-8)
      }
    }
    previousTotalDepth = width
  }
  for (let n = 1; n <= 175; n++) {
    near(outerRadiusForFriends(n) - outerRadiusForFriends(n - 1),
      growthLayerSpacing(n), `no radial gaps, layer ${n}`)
  }
})

test('original three waves, twenty facets and flower artwork stay unchanged', () => {
  assert.equal(PANEL_SEGMENTS, 20)
  for (let friends = 1; friends <= 50; friends++) {
    const n = growthForFriends(friends)
    assert.equal(n, 3 * friends)
    assert.ok(isFriendBoundary(n))
    assert.ok(!isFriendBoundary(n - 1))
  }
  const render = readFileSync(
    new URL('../src/features/lantern/renderer/ProceduralOuterShell.tsx', import.meta.url), 'utf8')
  assert.ok(render.includes('regionIndex > FLOWER_REGION_INDEX'))
  assert.ok(render.includes('completedOuterOrnamentScale(regionIndex) * completion'))
  assert.ok(render.includes('scale(${fillSize * ornamentEmphasis})'))
  assert.ok(render.includes('Math.min(3.1, Math.max(.55, (end - region.from + 1) * 10.5 / 39))'))
  assert.ok(render.includes('Array.from({ length: PANEL_SEGMENTS }'))
  assert.ok(render.includes('isFriendBoundary(n) && <path'))
  assert.ok(render.includes('ExtendedRegionMotif'))
})

test('floral silhouette stays nested and visible, including the later regions', () => {
  for (let n = 1; n <= 150; n++) {
    assert.ok(outerFitZoom(n) > 0)
    for (let j = 0; j < 40; j++) {
      const angle = j * Math.PI / 20
      const a = festivalPointAt(n - 1, angle)
      const b = festivalPointAt(n, angle)
      assert.ok(Math.hypot(b.x - 300, b.y - 302) >
        Math.hypot(a.x - 300, a.y - 302), `nested ${n}, angle ${j}`)
    }
  }
  const story = readFileSync(
    new URL('../src/features/story/StoryFrame.tsx', import.meta.url), 'utf8')
  assert.ok(story.includes('<ProceduralOuterShell'))
  assert.ok(story.includes('outerFitZoom(count)'))
})

test('invalid ornament indices are rejected', () => {
  for (const n of [-1, 1.5, 15, NaN, Infinity]) {
    assert.throws(() => ornamentWidthEmphasis(n), RangeError)
    assert.throws(() => completedOrnamentRadius(n), RangeError)
  }
})
