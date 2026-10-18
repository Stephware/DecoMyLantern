import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stageForFriends, DESIGN_TARGET_FRIENDS } from '../src/features/lantern/growth/stages.ts'
import { lightPosition } from '../src/features/lantern/renderer/lightPositions.ts'
import {
  BASE_STAR_RADIUS, FRIEND_LAYER_SPACING,
  friendStarLayers, friendStarBandPath, outerFitZoom,
  outerRadiusForFriends, starVertices,
} from '../src/features/lantern/growth/outerGrowth.ts'

const CORE_RADIUS = 5

function minimumSpacing(slots) {
  let closest = Infinity
  for (let i = 0; i < slots.length; i++) {
    const a = lightPosition(slots[i])
    for (let j = i + 1; j < slots.length; j++) {
      const b = lightPosition(slots[j])
      closest = Math.min(closest, Math.hypot(a.x - b.x, a.y - b.y))
    }
  }
  return closest
}

test('the 50-friend parol has 50 full star bands, not five rings', () => {
  assert.equal(DESIGN_TARGET_FRIENDS, 50)
  const fifty = friendStarLayers(50)
  assert.equal(fifty.length, 50)
  assert.equal(fifty[0].innerRadius, BASE_STAR_RADIUS)
  assert.equal(fifty[49].outerRadius, BASE_STAR_RADIUS + 50 * FRIEND_LAYER_SPACING)
  assert.equal(new Set(fifty.map(x => x.friendNumber)).size, 50)
  for (const layer of fifty) {
    assert.equal((friendStarBandPath(layer.friendNumber).match(/M /g) ?? []).length, 2)
    assert.ok(outerFitZoom(layer.friendNumber) > 0)
  }
})

test('there are no empty radial gaps between any adjacent layers', () => {
  const many = friendStarLayers(60)
  for (let i = 1; i < many.length; i++) {
    assert.equal(many[i].innerRadius, many[i - 1].outerRadius)
  }
  for (let i = 0; i < 120; i++) {
    const before = starVertices(outerRadiusForFriends(i))
    const after = starVertices(outerRadiusForFriends(i + 1))
    for (let p = 0; p < 10; p++) {
      assert.ok(Math.hypot(after[p].x - 300, after[p].y - 302) >
        Math.hypot(before[p].x - 300, before[p].y - 302))
    }
  }
})

test('50 inner contribution lights keep stable unique, non-overlapping positions', () => {
  const slots = Array.from({ length: 50 }, (_, i) => i)
  assert.ok(minimumSpacing(slots) > 2 * CORE_RADIUS)
  for (const slot of slots) {
    const { x, y, radius } = lightPosition(slot)
    assert.equal(radius, CORE_RADIUS)
    assert.ok(Math.hypot(x - 300, y - 302) < BASE_STAR_RADIUS)
  }
})

test('sparse persisted slots never shift other friends', () => {
  const initial = Array.from({ length: 50 }, (_, i) => i * 2)
  const afterRemoval = initial.filter((_, i) => i !== 16)
  assert.deepEqual(afterRemoval.map(lightPosition).at(-1), initial.map(lightPosition).at(-1))
  assert.ok(minimumSpacing(initial) > 2 * CORE_RADIUS)
  assert.equal(stageForFriends(49).key, 'fiesta')
})

test('outer layers keep accumulating after the last design unlock at 50', () => {
  for (const count of [51, 52, 75, 120]) {
    assert.equal(stageForFriends(count).key, 'sampaguita')
    assert.equal(friendStarLayers(count).length, count)
    assert.doesNotThrow(() => lightPosition(count - 1))
  }
  assert.notEqual(outerRadiusForFriends(50), outerRadiusForFriends(51))
})
