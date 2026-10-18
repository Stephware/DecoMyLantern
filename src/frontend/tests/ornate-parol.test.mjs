import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  OUTER_RECIPES,
  ornamentPlanForFriends,
  friendInlayPosition,
  insetStarPoints,
  outerFitZoom,
  outerRadiusForFriends,
  outerShellPath,
  outerPetalPath,
  motifCountForFriends,
} from '../src/features/lantern/growth/outerGrowth.ts'

const DESIGN_KEYS = Object.keys(OUTER_RECIPES)
const MILESTONES = [0, 1, 2, 3, 10, 23, 40, 50, 51, 60, 120]

test('every style has an intricate base parol even with no friends', () => {
  const plan = ornamentPlanForFriends(0)
  assert.equal(DESIGN_KEYS.length, 6)
  assert.equal(plan.bulbs, 40)
  assert.equal(plan.scallops, 30)
  assert.equal(plan.starlets, 5)
  assert.equal(motifCountForFriends(0), 25)
  for (const key of DESIGN_KEYS) {
    assert.ok(outerShellPath(0, key).startsWith('M '))
    assert.ok(outerPetalPath(0, key, 0).endsWith(' Z'))
  }
})

test('a new friend adds exactly five glass inlays, one in each sector', () => {
  for (let friendIndex = 0; friendIndex < 50; friendIndex++) {
    const inlays = Array.from({ length: 5 }, (_, sector) =>
      friendInlayPosition(friendIndex, sector))
    const radii = inlays.map(({ x, y }) => Math.hypot(x - 300, y - 302))
    for (const distance of radii) {
      assert.ok(Math.abs(distance - radii[0]) < 1e-8)
    }
    assert.equal(new Set(inlays.map(p => `${p.x.toFixed(5)}:${p.y.toFixed(5)}`)).size, 5)
  }
  assert.notDeepEqual(friendInlayPosition(0, 0), friendInlayPosition(1, 0))
  assert.throws(() => friendInlayPosition(-1, 0), RangeError)
  assert.throws(() => friendInlayPosition(0, 5), RangeError)
})

test('every friend redraws the framed silhouette without runaway zoom-out', () => {
  for (const key of DESIGN_KEYS) {
    for (let friends = 1; friends <= 120; friends++) {
      assert.notEqual(outerShellPath(friends, key), outerShellPath(friends - 1, key))
    }
  }
  for (const friends of MILESTONES) {
    const radius = outerRadiusForFriends(friends)
    assert.ok(radius >= 215)
    const fit = outerFitZoom(friends)
    assert.ok(fit > .75, `parol should remain readable at ${friends} friends`)
    assert.ok((radius + 20) * fit < 280)
  }
})

test('glass-bead density grows in coordinated fivefold groups', () => {
  let last = ornamentPlanForFriends(0)
  for (let friends = 1; friends <= 120; friends++) {
    const next = ornamentPlanForFriends(friends)
    for (const property of ['bulbs', 'scallops', 'starlets']) {
      assert.ok(next[property] >= last[property])
      assert.equal(next[property] % 5, 0)
    }
    assert.ok(motifCountForFriends(friends) % 5 === 0)
    last = next
  }
})

test('inlaid miniature five-point stars have ten alternating vertices', () => {
  for (const [outer, inner] of [[12, 6], [24, 10]]) {
    const points = insetStarPoints(300, 302, outer, inner).split(' ')
    assert.equal(points.length, 10)
    assert.equal(new Set(points).size, 10)
    assert.equal(points.some(p => p.includes('NaN')), false)
  }
})
