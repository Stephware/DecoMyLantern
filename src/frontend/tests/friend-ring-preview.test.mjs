import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DESIGN_MILESTONES,
  PREVIEW_MAX_FRIENDS,
  lastReachedMilestone,
  nextMilestone,
  ringAutoFitScale,
  ringRadius,
} from '../src/features/lantern/preview/friendRingGeometry.ts'

test('each test friend adds one uniquely placed outer ring', () => {
  const radii = Array.from({ length: PREVIEW_MAX_FRIENDS }, (_, slot) => ringRadius(slot))
  assert.equal(radii.length, 60)
  assert.equal(new Set(radii).size, 60)
  for (let slot = 1; slot < radii.length; slot++) {
    assert.ok(radii[slot] > radii[slot - 1])
  }
})

test('auto-fit scale falls smoothly after every accepted test friend', () => {
  assert.equal(ringAutoFitScale(0), 1)
  let previousScale = ringAutoFitScale(0)
  for (let count = 1; count <= PREVIEW_MAX_FRIENDS; count++) {
    const scale = ringAutoFitScale(count)
    assert.ok(scale < previousScale, `count ${count} must zoom out`)
    assert.ok(ringRadius(count - 1) * scale < 285, `count ${count} must fit the viewport`)
    previousScale = scale
  }
})

test('friend thresholds are 0, 3, 10, 23, 40, 50; no cap at 50', () => {
  assert.deepEqual([...DESIGN_MILESTONES], [0, 3, 10, 23, 40, 50])
  for (const [count, reached, next] of [
    [0, 0, 3], [1, 0, 3], [2, 0, 3], [3, 3, 10],
    [9, 3, 10], [10, 10, 23], [22, 10, 23],
    [23, 23, 40], [39, 23, 40], [40, 40, 50],
    [49, 40, 50], [50, 50, null], [60, 50, null],
  ]) {
    assert.equal(lastReachedMilestone(count), reached)
    assert.equal(nextMilestone(count), next)
  }
})

test('preview helpers reject invalid counts', () => {
  for (const bad of [-1, 0.2, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => ringRadius(bad), RangeError)
    assert.throws(() => ringAutoFitScale(bad), RangeError)
    assert.throws(() => lastReachedMilestone(bad), RangeError)
    assert.throws(() => nextMilestone(bad), RangeError)
  }
})
