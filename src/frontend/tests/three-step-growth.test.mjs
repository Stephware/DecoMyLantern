import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  POINTS_PER_FRIEND, GROWTH_STEP_DURATIONS, growthPointsForFriends,
  completedGrowth, growthPointsDuring, visibleGrowthBands,
  retargetGrowth, advanceGrowth,
} from '../src/features/lantern/growth/animation.ts'

test('one friend produces three growth points but only one filled outer band', () => {
  assert.equal(POINTS_PER_FRIEND, 3)
  for (const [friends, points] of [[0, 0], [1, 3], [3, 9], [10, 30], [23, 69],
    [40, 120], [50, 150], [51, 153]]) {
    assert.equal(growthPointsForFriends(friends), points)
    assert.equal(visibleGrowthBands(completedGrowth(friends)), friends)
  }
  for (const invalid of [-1, 0.3, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => growthPointsForFriends(invalid), RangeError)
  }
})

test('the three stages complete in 1.8 seconds and create one boundary', () => {
  assert.deepEqual(GROWTH_STEP_DURATIONS, [500, 700, 600])
  let state = retargetGrowth(completedGrowth(0), 1, false)
  assert.equal(growthPointsDuring(state), 1)
  assert.equal(visibleGrowthBands(state), 1)
  state = advanceGrowth(state)
  assert.equal(growthPointsDuring(state), 2)
  assert.equal(visibleGrowthBands(state), 1)
  state = advanceGrowth(state)
  assert.equal(growthPointsDuring(state), 3)
  assert.equal(visibleGrowthBands(state), 1)
  state = advanceGrowth(state)
  assert.deepEqual(state, completedGrowth(1))
})

test('new friends animate in order, not as stacked boundaries', () => {
  let state = retargetGrowth(completedGrowth(2), 4, false)
  assert.equal(growthPointsDuring(state), 7)
  state = advanceGrowth(advanceGrowth(advanceGrowth(state)))
  assert.equal(state.completedFriends, 3)
  assert.equal(state.phase, 1)
  assert.equal(growthPointsDuring(state), 10)
  state = advanceGrowth(advanceGrowth(advanceGrowth(state)))
  assert.deepEqual(state, completedGrowth(4))
})

test('existing friends on reload, preview jumps and removed friends settle instantly', () => {
  assert.deepEqual(retargetGrowth(completedGrowth(0), 50, true), completedGrowth(50))
  assert.deepEqual(retargetGrowth(completedGrowth(50), 49, false), completedGrowth(49))
  const playing = retargetGrowth(completedGrowth(1), 2, false)
  assert.deepEqual(retargetGrowth(playing, 50, true), completedGrowth(50))
  assert.deepEqual(retargetGrowth(completedGrowth(3), 3, false), completedGrowth(3))
})
