import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BASE_STAR_RADIUS, FRIEND_LAYER_SPACING, STAR_NOTCH_RATIO,
  OUTER_RECIPES, friendStarLayers, friendStarBandPath,
  friendStarFacetPath, starVertices, starOutlinePath,
  starTipPosition, starNotchPosition,
  lowerRibbonAnchors, outerRadiusForFriends, outerFitZoom,
} from '../src/features/lantern/growth/outerGrowth.ts'

test('exactly one complete outer star band appears per accepted friend', () => {
  for (const count of [0, 1, 2, 3, 10, 23, 40, 49, 50, 51, 60, 120]) {
    const layers = friendStarLayers(count)
    assert.equal(layers.length, count)
    for (let i = 0; i < count; i++) {
      assert.equal(layers[i].friendNumber, i + 1)
      assert.equal(layers[i].innerRadius, outerRadiusForFriends(i))
      assert.equal(layers[i].outerRadius, outerRadiusForFriends(i + 1))
      assert.equal(layers[i].outerRadius - layers[i].innerRadius, FRIEND_LAYER_SPACING)
    }
  }
  assert.equal(friendStarLayers(50).length, 50)
})

test('every star layer is a FILLED, star-shaped band without an empty gap', () => {
  assert.equal(BASE_STAR_RADIUS, 158)
  assert.equal(BASE_STAR_RADIUS * STAR_NOTCH_RATIO, 74)
  for (let friend = 1; friend <= 120; friend++) {
    const band = friendStarBandPath(friend)
    assert.equal((band.match(/M /g) ?? []).length, 2)
    assert.equal((band.match(/ Z/g) ?? []).length, 2)
    assert.ok(band.startsWith(starOutlinePath(outerRadiusForFriends(friend))))
    assert.ok(band.includes(starOutlinePath(outerRadiusForFriends(friend - 1))))
    for (let segment = 0; segment < 10; segment++) {
      const facet = friendStarFacetPath(friend, segment)
      assert.ok(facet.startsWith('M '))
      assert.ok(facet.endsWith(' Z'))
      assert.equal((facet.match(/ L /g) ?? []).length, 3)
      assert.ok(!/(NaN|Infinity)/.test(facet))
    }
  }
})

test('five-pointed contours are nested with ten alternating vertices', () => {
  for (let count = 0; count <= 120; count++) {
    const verts = starVertices(outerRadiusForFriends(count))
    assert.equal(verts.length, 10)
    for (let i = 0; i < 10; i++) {
      const distance = Math.hypot(verts[i].x - 300, verts[i].y - 302)
      const expected = outerRadiusForFriends(count) * (i % 2 ? STAR_NOTCH_RATIO : 1)
      assert.ok(Math.abs(distance - expected) < 1e-8)
      if (count > 0) {
        const previous = starVertices(outerRadiusForFriends(count - 1))[i]
        assert.ok(distance > Math.hypot(previous.x - 300, previous.y - 302))
      }
    }
  }
})

test('each friend adds five symmetric tip jewels and five notch jewels', () => {
  for (let friend = 1; friend <= 80; friend++) {
    const tips = Array.from({ length: 5 }, (_, sector) => starTipPosition(friend, sector))
    const notches = Array.from({ length: 5 }, (_, sector) => starNotchPosition(friend, sector))
    assert.equal(new Set(tips.map(x => `${x.x.toFixed(6)}:${x.y.toFixed(6)}`)).size, 5)
    assert.equal(new Set(notches.map(x => `${x.x.toFixed(6)}:${x.y.toFixed(6)}`)).size, 5)
    for (const set of [tips, notches]) {
      const distances = set.map(p => Math.hypot(p.x - 300, p.y - 302))
      for (const r of distances) assert.ok(Math.abs(r - distances[0]) < 1e-8)
    }
  }
})

test('the hanger and five tassels follow the outermost star, never the center', () => {
  for (const count of [0, 1, 10, 23, 40, 50, 120]) {
    const anchors = lowerRibbonAnchors(count)
    assert.equal(anchors.length, 5)
    assert.equal(anchors[0].x + anchors[4].x, 600)
    assert.equal(anchors[1].x + anchors[3].x, 600)
    assert.equal(anchors[2].x, 300)
    assert.ok(anchors[0].y > anchors[2].y)
    assert.ok((outerRadiusForFriends(count) + 76) * outerFitZoom(count) <= 281)
    assert.ok((outerRadiusForFriends(count) * Math.sin(54 * Math.PI / 180) + 164) *
      outerFitZoom(count) <= 289)
  }
  assert.ok(lowerRibbonAnchors(50)[0].y > lowerRibbonAnchors(0)[0].y)
})

test('six collection motifs remain distinct even though each is a star parol', () => {
  const motifs = Object.values(OUTER_RECIPES).map(x => x.motif)
  assert.equal(motifs.length, 6)
  assert.equal(new Set(motifs).size, 6)
})

test('invalid counts and star sectors are rejected', () => {
  for (const invalid of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => friendStarLayers(invalid), RangeError)
    assert.throws(() => outerRadiusForFriends(invalid), RangeError)
  }
  assert.throws(() => friendStarBandPath(0), RangeError)
  assert.throws(() => friendStarFacetPath(1, 10), RangeError)
  assert.throws(() => starTipPosition(1, 5), RangeError)
  assert.throws(() => starNotchPosition(1, 5), RangeError)
})
