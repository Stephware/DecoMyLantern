import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lightPosition } from '../src/features/lantern/renderer/lightPositions.ts'
import { stageForFriends, nextDesignMilestone, STAGES } from '../src/features/lantern/growth/stages.ts'
import {
  OUTER_RECIPES, outerShellPath, outerFitZoom, outerRadiusForFriends,
  shellCountForFriends, motifCountForFriends,
} from '../src/features/lantern/growth/outerGrowth.ts'

test('design milestones unlock at 0, 3, 10, 23, 40 and 50 friends', () => {
  assert.deepEqual(STAGES.map(x => x.minFriends), [0, 3, 10, 23, 40, 50])
  const examples = [
    [0, 'base'], [1, 'base'], [2, 'base'], [3, 'floral'],
    [9, 'floral'], [10, 'festival'], [22, 'festival'],
    [23, 'celestial'], [39, 'celestial'], [40, 'fiesta'],
    [49, 'fiesta'], [50, 'sampaguita'], [120, 'sampaguita'],
  ]
  for (const [count, key] of examples) assert.equal(stageForFriends(count).key, key)
  assert.equal(nextDesignMilestone(49).minFriends, 50)
  assert.equal(nextDesignMilestone(50), null)
})

test('every friend from 0 to 120 changes the entire silhouette', () => {
  for (const key of Object.keys(OUTER_RECIPES)) {
    let previous = null
    for (let count = 0; count <= 120; count++) {
      const path = outerShellPath(count, key)
      assert.ok(path.startsWith('M '))
      assert.ok(path.endsWith(' Z'))
      assert.ok(!path.includes('NaN'))
      assert.ok(!path.includes('Infinity'))
      if (previous !== null) assert.notEqual(path, previous, `${key}: friend ${count}`)
      previous = path
    }
  }
})

test('six parol design families produce different artwork at the same friend count', () => {
  const keys = Object.keys(OUTER_RECIPES)
  assert.equal(keys.length, 6)
  const paths = keys.map(key => outerShellPath(23, key))
  assert.equal(new Set(paths).size, 6)
})

test('outer shells grow and auto-fit without a fixed ring or 50-friend cap', () => {
  assert.equal(shellCountForFriends(0, 'classic'), 2)
  for (let count = 1; count <= 120; count++) {
    assert.ok(outerRadiusForFriends(count) > outerRadiusForFriends(count - 1))
    assert.ok(outerFitZoom(count) <= outerFitZoom(count - 1) + 1e-10)
    assert.ok((outerRadiusForFriends(count) + 20) * outerFitZoom(count) <= 280)
    assert.ok(motifCountForFriends(count) % 5 === 0)
    assert.ok(motifCountForFriends(count) <= 50)
  }
})

test('contributor light locations remain bound to immutable persisted slots', () => {
  const original = lightPosition(17)
  assert.deepEqual(lightPosition(17), original)
  assert.notDeepEqual(lightPosition(18), original)
  assert.deepEqual([0, 8, 17].map(lightPosition)[2], original)
})

test('invalid friend counts, layers and light slots are rejected', () => {
  for (const invalid of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => lightPosition(invalid), RangeError)
    assert.throws(() => stageForFriends(invalid), RangeError)
    assert.throws(() => outerRadiusForFriends(invalid), RangeError)
    assert.throws(() => outerShellPath(invalid, 'floral'), RangeError)
    assert.throws(() => shellCountForFriends(invalid, 'classic'), RangeError)
  }
  assert.throws(() => outerShellPath(10, 'classic', 4), RangeError)
})
