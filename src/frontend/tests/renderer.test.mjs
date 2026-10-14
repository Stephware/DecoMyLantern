import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lightPosition } from '../src/features/lantern/renderer/lightPositions.ts'
import { stageForFriends, nextStage } from '../src/features/lantern/growth/stages.ts'

test('each milestone is reached at exactly 0, 5, 15 and 30 accepted friends', () => {
  const cases = [[0, 'base'], [4, 'base'], [5, 'enhanced'], [14, 'enhanced'], [15, 'radiant'], [29, 'radiant'], [30, 'grand'], [65, 'grand']]
  for (const [count, expected] of cases) {
    assert.equal(stageForFriends(count).key, expected)
  }
  assert.equal(nextStage(4)?.requiredFriends, 5)
  assert.equal(nextStage(5)?.requiredFriends, 15)
  assert.equal(nextStage(15)?.requiredFriends, 30)
  assert.equal(nextStage(30), undefined)
})

test('light coordinates are derived only from their stable persisted slot index', () => {
  const original = lightPosition(17)
  assert.deepEqual(lightPosition(17), original)
  assert.notDeepEqual(lightPosition(18), original)
  // Removing slot 16 leaves slot 17 exactly where it already was.
  const survivingSlots = [0, 8, 17]
  assert.deepEqual(survivingSlots.map(lightPosition)[2], original)
})

test('the first 120 slots do not overlap exactly and are finite', () => {
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

test('bad contribution slot indices cannot enter the renderer', () => {
  for (const value of [-1, 0.5, NaN, Infinity]) {
    assert.throws(() => lightPosition(value), RangeError)
  }
})
