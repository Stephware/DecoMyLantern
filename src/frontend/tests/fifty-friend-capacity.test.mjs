import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stageForFriends, decorationCounts, DESIGN_TARGET_FRIENDS } from '../src/features/lantern/growth/stages.ts'
import { lightPosition } from '../src/features/lantern/renderer/lightPositions.ts'

// The user experience target is 50 active friends, NOT a hard backend cap.
// A real contribution always keeps its stable database SlotIndex even if
// another contribution is removed or the visual progression changes.
const SVG = { width: 600, height: 640 }
const CENTER = { x: 300, y: 302 }
const CORE_RADIUS = 5
const HALO_MULTIPLIER = 2.8
const MOBILE_WIDTHS = [320, 375, 430]
const ranges = [
  { begin: 0, end: 0, stage: 'base' },
  { begin: 1, end: 5, stage: 'lights' },
  { begin: 6, end: 15, stage: 'details' },
  { begin: 16, end: 30, stage: 'fuller' },
  { begin: 31, end: 50, stage: 'grand' },
]

function sumAccents(counts) {
  return counts.details + counts.fuller + counts.grand
}

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

test('0 through 50 accepted friends always map to the five agreed ranges', () => {
  assert.equal(DESIGN_TARGET_FRIENDS, 50)
  for (const range of ranges) {
    for (let count = range.begin; count <= range.end; count++) {
      assert.equal(stageForFriends(count).key, range.stage, `count ${count}`)
    }
  }
})

test('every friend from 1 through 50 produces exactly one new visible light', () => {
  for (let count = 1; count <= DESIGN_TARGET_FRIENDS; count++) {
    const slots = Array.from({ length: count }, (_, index) => index)
    assert.equal(slots.length, count)
    assert.equal(new Set(slots.map(slot => {
      const point = lightPosition(slot)
      return `${point.x.toFixed(8)}:${point.y.toFixed(8)}`
    })).size, count, `duplicate light coordinate at ${count} friends`)
  }
})

test('decoration density advances one friend at a time (never a locked batch jump)', () => {
  assert.equal(sumAccents(decorationCounts(0)), 0)
  for (let count = 1; count <= DESIGN_TARGET_FRIENDS; count++) {
    const before = decorationCounts(count - 1)
    const after = decorationCounts(count)
    const expectedExtra = count <= 5 ? 0 : 1
    assert.equal(sumAccents(after) - sumAccents(before), expectedExtra, `friend ${count}`)
    assert.equal(after.details, Math.min(Math.max(count - 5, 0), 10))
    assert.equal(after.fuller, Math.min(Math.max(count - 15, 0), 15))
    assert.equal(after.grand, Math.min(Math.max(count - 30, 0), 20))
  }
  assert.deepEqual(decorationCounts(50), { details: 10, fuller: 15, grand: 20 })
  assert.equal(sumAccents(decorationCounts(50)), 45)
})

test('all 50 light cores remain non-overlapping at the full design target', () => {
  const slots = Array.from({ length: DESIGN_TARGET_FRIENDS }, (_, i) => i)
  for (const slot of slots) {
    const point = lightPosition(slot)
    assert.equal(point.radius, CORE_RADIUS)
  }
  // Glow halos are intentionally allowed to overlap. Opaque inner cores must not.
  assert.ok(minimumSpacing(slots) > CORE_RADIUS * 2, 'inner light cores intersect')
})

test('all 50 glow halos fit within the SVG viewBox with generous padding', () => {
  for (let slot = 0; slot < DESIGN_TARGET_FRIENDS; slot++) {
    const { x, y, radius } = lightPosition(slot)
    const halo = radius * HALO_MULTIPLIER
    assert.ok(x - halo >= 20, `light ${slot} crosses the left safe boundary`)
    assert.ok(y - halo >= 20, `light ${slot} crosses the top safe boundary`)
    assert.ok(x + halo <= SVG.width - 20, `light ${slot} crosses the right safe boundary`)
    assert.ok(y + halo <= SVG.height - 20, `light ${slot} crosses the bottom safe boundary`)
    assert.ok(Math.hypot(x - CENTER.x, y - CENTER.y) <= 132.001)
  }
})

test('responsive SVG scaling maintains distinguishable inner cores at mobile widths', () => {
  const closest = minimumSpacing(Array.from({ length: DESIGN_TARGET_FRIENDS }, (_, i) => i))
  for (const width of MOBILE_WIDTHS) {
    const scale = width / SVG.width
    // 600x640 preserveAspectRatio xMidYMid meet at a width-constrained viewport.
    assert.ok(closest * scale > (2 * CORE_RADIUS * scale), `touching light cores at width ${width}`)
    assert.ok(closest * scale > 10, `lights unusually crowded at width ${width}`)
  }
})

test('fewer than 50 accepted friends can retain stable sparse slot indexes', () => {
  const slots = Array.from({ length: DESIGN_TARGET_FRIENDS }, (_, i) => i * 2)
  assert.equal(new Set(slots).size, 50)
  // Positions must be derived from persisted indexes, never compacted.
  const expectedPositions = slots.map(lightPosition)
  const afterRemoval = slots.filter((_, i) => i !== 16)
  assert.deepEqual(afterRemoval.map(lightPosition).at(-1), expectedPositions.at(-1))
  assert.equal(stageForFriends(afterRemoval.length).key, 'grand')
  assert.equal(sumAccents(decorationCounts(afterRemoval.length)), 44)
  assert.ok(minimumSpacing(slots) > CORE_RADIUS * 2)
})

test('51st friend is not rejected: grand accents saturate but new light remains', () => {
  for (const count of [51, 52, 75, 120]) {
    assert.equal(stageForFriends(count).key, 'grand')
    assert.deepEqual(decorationCounts(count), decorationCounts(50))
    assert.doesNotThrow(() => lightPosition(count - 1))
  }
  assert.notDeepEqual(lightPosition(50), lightPosition(49))
})

test('invalid counts and slots fail explicitly; neither infinity nor NaN enters artwork', () => {
  for (const invalid of [-1, -50, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => stageForFriends(invalid), RangeError)
    assert.throws(() => decorationCounts(invalid), RangeError)
    assert.throws(() => lightPosition(invalid), RangeError)
  }
})
