import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stageForFriends, DESIGN_TARGET_FRIENDS } from '../src/features/lantern/growth/stages.ts'
import { lightPosition } from '../src/features/lantern/renderer/lightPositions.ts'
import {
  OUTER_RECIPES, outerFitZoom, outerRadiusForFriends, outerShellPath,
  outerPetalPath, motifCountForFriends, shellCountForFriends,
} from '../src/features/lantern/growth/outerGrowth.ts'

// 50 unlocks the final design but is not a cap on real contributions.
const SVG = { width: 600, height: 640 }
const CENTER = { x: 300, y: 302 }
const CORE_RADIUS = 5
const MOBILE_WIDTHS = [240, 295, 350]

function minimumSpacing(slots) {
  let closest = Infinity
  for (let i = 0; i < slots.length; i++) {
    const first = lightPosition(slots[i])
    for (let j = i + 1; j < slots.length; j++) {
      const other = lightPosition(slots[j])
      closest = Math.min(closest, Math.hypot(first.x - other.x, first.y - other.y))
    }
  }
  return closest
}

test('all counts 0–50 have a valid and unique six-family shell', () => {
  assert.equal(DESIGN_TARGET_FRIENDS, 50)
  for (let count = 0; count <= 50; count++) {
    const keys = Object.keys(OUTER_RECIPES)
    const contours = keys.map(key => outerShellPath(count, key))
    assert.equal(new Set(contours).size, keys.length)
    for (const key of keys) {
      const recipe = OUTER_RECIPES[key]
      const layers = shellCountForFriends(count, key)
      assert.ok(layers >= 1 && layers <= recipe.contourCount + 1)
      const motifs = motifCountForFriends(count)
      assert.ok(motifs >= 5 && motifs <= 40)
      assert.ok(outerPetalPath(count, key, 0).endsWith(' Z'))
      assert.ok((outerRadiusForFriends(count) + 20) * outerFitZoom(count) <= 280)
    }
  }
})

test('50 saved friend light cores keep stable unique coordinates with visible margins', () => {
  const slots = Array.from({ length: 50 }, (_, index) => index)
  assert.ok(minimumSpacing(slots) > 2 * CORE_RADIUS)
  for (const slot of slots) {
    const { x, y, radius } = lightPosition(slot)
    assert.equal(radius, CORE_RADIUS)
    assert.ok(x - radius * 2.8 >= 20 && x + radius * 2.8 <= SVG.width - 20)
    assert.ok(y - radius * 2.8 >= 20 && y + radius * 2.8 <= SVG.height - 20)
    assert.ok(Math.hypot(x - CENTER.x, y - CENTER.y) <= 132.001)
  }
})

test('mobile scaling leaves the identity cores distinguishable', () => {
  const closest = minimumSpacing(Array.from({ length: 50 }, (_, i) => i))
  for (const width of MOBILE_WIDTHS) {
    const scale = width / SVG.width
    assert.ok(closest * scale > 2 * CORE_RADIUS * scale)
    assert.ok(closest * scale > 7.5)
  }
})

test('sparse or removed slots keep existing friend identity and do not collapse', () => {
  const slots = Array.from({ length: 50 }, (_, i) => i * 2)
  const initial = slots.map(lightPosition)
  const withoutFriend = slots.filter((_, index) => index !== 16).map(lightPosition)
  assert.deepEqual(withoutFriend.at(-1), initial.at(-1))
  assert.equal(stageForFriends(49).key, 'fiesta')
  assert.ok(minimumSpacing(slots) > 2 * CORE_RADIUS)
})

test('visual shell continues evolving past 50 friends', () => {
  for (const count of [51, 52, 75, 120]) {
    assert.equal(stageForFriends(count).key, 'sampaguita')
    assert.ok(outerRadiusForFriends(count) > outerRadiusForFriends(50))
    assert.doesNotThrow(() => lightPosition(count - 1))
  }
  assert.notEqual(outerShellPath(51, 'classic'), outerShellPath(50, 'classic'))
  assert.notDeepEqual(lightPosition(50), lightPosition(49))
})
