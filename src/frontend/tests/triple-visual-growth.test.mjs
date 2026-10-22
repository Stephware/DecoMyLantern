import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  DESIGN_GROWTH_TARGET, GROWTH_PER_FRIEND, GROWTH_REGIONS,
  growthForFriends, isFriendBoundary, festivalLayers, festivalPointAt,
  growthZoneForLayer,
} from '../src/features/lantern/growth/outerGrowth.ts'
import {
  STEP_DURATIONS_MS, settledGrowth, visibleGrowth, visibleFriends,
  retargetGrowth, nextGrowthStep,
} from '../src/features/lantern/growth/reveal.ts'

test('one friend is exactly the original three friends of outward growth', () => {
  assert.equal(GROWTH_PER_FRIEND, 3)
  assert.equal(DESIGN_GROWTH_TARGET, 150)
  for (const [friends, expected] of [[0, 0], [1, 3], [2, 6], [17, 51], [50, 150], [51, 153]]) {
    assert.equal(growthForFriends(friends), expected)
    assert.equal(festivalLayers(growthForFriends(friends)).length, expected)
  }
})

test('150 growth layers produce exactly 50 completed friend contours', () => {
  const allBoundaries = Array.from({ length: 150 }, (_, i) => i + 1).filter(isFriendBoundary)
  assert.equal(allBoundaries.length, 50)
  assert.deepEqual(allBoundaries.slice(0, 3), [3, 6, 9])
  assert.equal(allBoundaries.at(-1), 150)
  assert.equal(GROWTH_REGIONS.length, 15)
  assert.equal(growthZoneForLayer(51), 'lattice')
  assert.equal(growthZoneForLayer(150), 'corona')
  assert.throws(() => growthForFriends(-1), RangeError)
  assert.throws(() => growthForFriends(Number.MAX_SAFE_INTEGER), RangeError)
})

test('each of the three visual waves adds exactly one complete growth layer', () => {
  assert.deepEqual(STEP_DURATIONS_MS, [750, 850, 1100])
  let reveal = retargetGrowth(settledGrowth(16), 17, false)
  assert.equal(visibleGrowth(reveal), 49)
  assert.equal(visibleFriends(reveal), 16)
  reveal = nextGrowthStep(reveal)
  assert.equal(visibleGrowth(reveal), 50)
  assert.equal(visibleFriends(reveal), 16)
  reveal = nextGrowthStep(reveal)
  assert.equal(visibleGrowth(reveal), 51)
  assert.equal(visibleFriends(reveal), 17)
  reveal = nextGrowthStep(reveal)
  assert.deepEqual(reveal, settledGrowth(17))
})

test('animations queue live arrivals without replaying historical growth', () => {
  let reveal = retargetGrowth(settledGrowth(1), 2, false)
  reveal = retargetGrowth(reveal, 3, false)
  reveal = nextGrowthStep(nextGrowthStep(nextGrowthStep(reveal)))
  assert.equal(visibleGrowth(reveal), 7)
  reveal = nextGrowthStep(nextGrowthStep(nextGrowthStep(reveal)))
  assert.deepEqual(reveal, settledGrowth(3))
  assert.deepEqual(retargetGrowth(reveal, 50, true), settledGrowth(50))
  assert.deepEqual(retargetGrowth(settledGrowth(50), 49, false), settledGrowth(49))
})

test('geometry remains outward and free of crossing at 150 growth', () => {
  for (let n = 1; n <= 150; n++) {
    for (let j = 0; j < 40; j++) {
      const angle = j * Math.PI * 2 / 40
      const a = festivalPointAt(n - 1, angle)
      const b = festivalPointAt(n, angle)
      assert.ok(Math.hypot(b.x - 300, b.y - 302) >
        Math.hypot(a.x - 300, a.y - 302), 'nested layer ' + n)
    }
  }
})

test('renderer only draws every third permanent outline and includes dramatic effects', () => {
  const render = readFileSync(new URL('../src/features/lantern/renderer/ProceduralOuterShell.tsx', import.meta.url), 'utf8')
  const scene = readFileSync(new URL('../src/features/lantern/renderer/LanternScene.tsx', import.meta.url), 'utf8')
  assert.ok(render.includes('isFriendBoundary(n) && <path'))
  assert.ok(render.includes('layers.filter(layer => isFriendBoundary(layer.friendNumber))'))
  assert.ok(render.includes('ExtendedRegionMotif'))
  assert.ok(render.includes('parol-growth-sparkle'))
  assert.ok(scene.includes('growthCount={growthCount}'))
})
