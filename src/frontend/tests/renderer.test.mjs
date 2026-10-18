import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lightPosition } from '../src/features/lantern/renderer/lightPositions.ts'
import { stageForFriends, nextDesignMilestone, STAGES } from '../src/features/lantern/growth/stages.ts'
import {
  OUTER_RECIPES, friendStarLayers, starOutlinePath,
  outerRadiusForFriends, outerFitZoom,
} from '../src/features/lantern/growth/outerGrowth.ts'

test('design unlock milestones remain independent of actual star layers', () => {
  assert.deepEqual(STAGES.map(stage => stage.minFriends), [0, 3, 10, 23, 40, 50])
  for (const [count, expected] of [
    [0, 'base'], [1, 'base'], [2, 'base'], [3, 'floral'], [9, 'floral'],
    [10, 'festival'], [22, 'festival'], [23, 'celestial'],
    [39, 'celestial'], [40, 'fiesta'], [49, 'fiesta'],
    [50, 'sampaguita'], [51, 'sampaguita'], [120, 'sampaguita'],
  ]) assert.equal(stageForFriends(count).key, expected)
  assert.equal(nextDesignMilestone(49).minFriends, 50)
  assert.equal(nextDesignMilestone(50), null)
})

test('every friend changes the WHOLE five-pointed outline and adds a filled layer', () => {
  for (let friend = 1; friend <= 120; friend++) {
    assert.notEqual(starOutlinePath(outerRadiusForFriends(friend)),
      starOutlinePath(outerRadiusForFriends(friend - 1)))
    assert.equal(friendStarLayers(friend).length - friendStarLayers(friend - 1).length, 1)
    assert.ok(outerFitZoom(friend) <= outerFitZoom(friend - 1))
  }
})

test('all six families preserve a recognizable star and unique style recipe', () => {
  assert.equal(Object.keys(OUTER_RECIPES).length, 6)
  assert.equal(new Set(Object.values(OUTER_RECIPES).map(v => v.motif)).size, 6)
})

test('individual friend lights never move when other contributions join', () => {
  const original = lightPosition(17)
  assert.deepEqual(lightPosition(17), original)
  assert.notDeepEqual(lightPosition(18), original)
  assert.deepEqual([0, 8, 17].map(lightPosition)[2], original)
})

test('invalid slot and growth counts do not enter artwork', () => {
  for (const bad of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => lightPosition(bad), RangeError)
    assert.throws(() => stageForFriends(bad), RangeError)
    assert.throws(() => friendStarLayers(bad), RangeError)
  }
})
