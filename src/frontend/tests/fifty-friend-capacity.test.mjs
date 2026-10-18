import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BASE_FESTIVAL_RADIUS, FRIEND_LAYER_SPACING, PANEL_SEGMENTS,
  GROWTH_REGIONS, festivalLayers, outerRadiusForFriends,
  outerFitZoom, festivalFacetPath,
} from '../src/features/lantern/growth/outerGrowth.ts'
import { stageForFriends, DESIGN_TARGET_FRIENDS } from '../src/features/lantern/growth/stages.ts'
import { lightPosition } from '../src/features/lantern/renderer/lightPositions.ts'

function closestDistance(slots) {
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

test('50 friends produce 50 filled bands, 1000 capiz facet panels', () => {
  assert.equal(DESIGN_TARGET_FRIENDS, 50)
  const layers = festivalLayers(50)
  assert.equal(layers.length, 50)
  assert.equal(layers[0].innerRadius, BASE_FESTIVAL_RADIUS)
  assert.equal(layers[49].outerRadius, BASE_FESTIVAL_RADIUS + 50 * FRIEND_LAYER_SPACING)
  assert.equal(PANEL_SEGMENTS * layers.length, 1000)
  for (const layer of layers) {
    assert.ok(festivalFacetPath(layer.friendNumber, 0).startsWith('M '))
  }
})

test('the first 50 layers fill five sequential connected ornamental regions', () => {
  const layers = festivalLayers(50)
  for (let i = 1; i < layers.length; i++) {
    assert.equal(layers[i].innerRadius, layers[i - 1].outerRadius)
  }
  for (const { from, to, zone } of GROWTH_REGIONS) {
    assert.equal(layers.filter(x => x.zone === zone).length, to - from + 1)
  }
})

test('50 inner contributed lights remain separate and non-overlapping', () => {
  const slots = Array.from({ length: 50 }, (_, i) => i)
  assert.ok(closestDistance(slots) > 10)
  for (const slot of slots) {
    const { x, y, radius } = lightPosition(slot)
    assert.equal(radius, 5)
    assert.ok(Math.hypot(x - 300, y - 302) < BASE_FESTIVAL_RADIUS)
  }
})

test('the lantern auto-fits on small screens instead of growing off-canvas', () => {
  assert.equal(outerFitZoom(0), 1)
  for (const count of [1, 3, 10, 23, 40, 50, 60, 120]) {
    assert.ok(outerFitZoom(count) > 0)
    assert.ok((outerRadiusForFriends(count) + 36) * outerFitZoom(count) < 281)
  }
})

test('sparse persisted light slots remain in place after deletion', () => {
  const slots = Array.from({ length: 50 }, (_, i) => i * 2)
  const before = slots.map(lightPosition)
  const after = slots.filter((_, i) => i !== 16).map(lightPosition)
  assert.deepEqual(after.at(-1), before.at(-1))
  assert.equal(stageForFriends(49).key, 'fiesta')
})

test('50 is only the final design milestone, not a layer count cap', () => {
  assert.equal(stageForFriends(120).key, 'sampaguita')
  assert.equal(festivalLayers(51).length, 51)
  assert.equal(festivalLayers(120).length, 120)
})
