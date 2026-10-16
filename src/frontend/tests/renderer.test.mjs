import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lightPosition } from '../src/features/lantern/renderer/lightPositions.ts'
import { stageForFriends, decorationCounts } from '../src/features/lantern/growth/stages.ts'

test('the five visual ranges are complete base, lights, details, fuller and grand', () => {
  const cases = [
    [0, 'base'], [1, 'lights'], [5, 'lights'], [6, 'details'],
    [15, 'details'], [16, 'fuller'], [30, 'fuller'], [31, 'grand'],
    [50, 'grand'], [51, 'grand'], [120, 'grand'],
  ]
  for (const [count, expected] of cases) {
    assert.equal(stageForFriends(count).key, expected)
  }
})

test('every friend adds a light or one new decorative accent through 50 friends', () => {
  assert.deepEqual(decorationCounts(0), { details: 0, fuller: 0, grand: 0 })
  assert.deepEqual(decorationCounts(5), { details: 0, fuller: 0, grand: 0 })
  assert.deepEqual(decorationCounts(6), { details: 1, fuller: 0, grand: 0 })
  assert.deepEqual(decorationCounts(15), { details: 10, fuller: 0, grand: 0 })
  assert.deepEqual(decorationCounts(16), { details: 10, fuller: 1, grand: 0 })
  assert.deepEqual(decorationCounts(30), { details: 10, fuller: 15, grand: 0 })
  assert.deepEqual(decorationCounts(31), { details: 10, fuller: 15, grand: 1 })
  assert.deepEqual(decorationCounts(50), { details: 10, fuller: 15, grand: 20 })
  assert.deepEqual(decorationCounts(51), decorationCounts(50))

  for (let friends = 1; friends <= 50; friends++) {
    const before = decorationCounts(friends - 1)
    const after = decorationCounts(friends)
    const total = value => value.details + value.fuller + value.grand
    // Friends #1–5 get a light; #6–50 get a light plus exactly one outer accent.
    assert.equal(total(after) - total(before), friends <= 5 ? 0 : 1)
  }
})

test('light coordinates depend only on the persisted slot and survive sparse removals', () => {
  const original = lightPosition(17)
  assert.deepEqual(lightPosition(17), original)
  assert.notDeepEqual(lightPosition(18), original)
  assert.deepEqual([0, 8, 17].map(lightPosition)[2], original)
})

test('at least the first 120 light slots are distinct and inside finite coordinates', () => {
  const seen = new Set()
  for (let i = 0; i < 120; i++) {
    const light = lightPosition(i)
    assert.ok(Number.isFinite(light.x))
    assert.ok(Number.isFinite(light.y))
    assert.ok(light.radius > 0)
    assert.ok(Math.hypot(light.x - 300, light.y - 302) <= 132.0001)
    const key = `${light.x.toFixed(4)}:${light.y.toFixed(4)}`
    assert.equal(seen.has(key), false)
    seen.add(key)
  }
})

test('negative or non-integer stage counts and contribution slots are rejected', () => {
  for (const value of [-1, 0.5, NaN, Infinity]) {
    assert.throws(() => lightPosition(value), RangeError)
    assert.throws(() => stageForFriends(value), RangeError)
    assert.throws(() => decorationCounts(value), RangeError)
  }
})
