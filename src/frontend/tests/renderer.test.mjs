import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lightPosition } from '../src/features/lantern/renderer/lightPositions.ts'
import { stageForFriends, nextDesignMilestone, STAGES } from '../src/features/lantern/growth/stages.ts'
import {
  festivalLayers, festivalOutlinePath, growthForFriends, isFriendBoundary,
  outerFitZoom, OUTER_RECIPES,
} from '../src/features/lantern/growth/outerGrowth.ts'

test('growth milestones remain independent of selectable designs and structural layers', () => {
  assert.deepEqual(STAGES.map(s => s.minFriends), [0, 3, 10, 23, 40, 50])
  for (const [count, key] of [
    [0, 'base'], [1, 'base'], [2, 'base'], [3, 'floral'], [9, 'floral'],
    [10, 'festival'], [22, 'festival'], [23, 'celestial'],
    [39, 'celestial'], [40, 'fiesta'], [49, 'fiesta'],
    [50, 'sampaguita'], [120, 'sampaguita'],
  ]) assert.equal(stageForFriends(count).key, key)
  assert.equal(nextDesignMilestone(50), null)
})

test('each friend expands three full layers with only one completed outer boundary', () => {
  for (let friends = 1; friends <= 120; friends++) {
    const growth = growthForFriends(friends)
    const previous = growthForFriends(friends - 1)
    assert.equal(festivalLayers(growth).length - festivalLayers(previous).length, 3)
    assert.deepEqual([previous + 1, previous + 2, previous + 3].filter(isFriendBoundary), [growth])
    assert.notEqual(festivalOutlinePath(growth), festivalOutlinePath(previous))
    assert.ok(outerFitZoom(growth) <= outerFitZoom(previous))
  }
})

test('saved contributor identity lights are independent of exterior decoration', () => {
  const position = lightPosition(17)
  assert.deepEqual(lightPosition(17), position)
  assert.notDeepEqual(lightPosition(18), position)
  assert.deepEqual([0, 8, 17].map(lightPosition)[2], position)
})

test('all six design families have different festival-style motif rules', () => {
  assert.equal(Object.keys(OUTER_RECIPES).length, 6)
  assert.equal(new Set(Object.values(OUTER_RECIPES).map(x => x.motif)).size, 6)
})

test('invalid friend counts are rejected', () => {
  for (const n of [-1, NaN, Infinity, .5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => festivalLayers(n), RangeError)
    assert.throws(() => stageForFriends(n), RangeError)
    assert.throws(() => lightPosition(n), RangeError)
  }
})
