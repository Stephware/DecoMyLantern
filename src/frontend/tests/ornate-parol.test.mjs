import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  BASE_FESTIVAL_RADIUS,
  FRIEND_LAYER_SPACING,
  growthLayerSpacing,
  GROWTH_REGIONS,
  OUTER_RECIPES,
  PANEL_SEGMENTS,
  bandMotifPoint,
  festivalBandPath,
  festivalFacetPath,
  festivalLayers,
  festivalMaxExtent,
  festivalOutlinePath,
  festivalPointAt,
  growthForFriends,
  growthZoneForLayer,
  outerFitZoom,
  outerRadiusForFriends,
  regionPanelPath,
} from '../src/features/lantern/growth/outerGrowth.ts'

const styles = Object.keys(OUTER_RECIPES)

test('zero friends is a complete mini festival parol and never has a tail', () => {
  assert.equal(BASE_FESTIVAL_RADIUS, 164)
  assert.equal(festivalLayers(0).length, 0)
  const core = readFileSync(new URL('../src/features/lantern/renderer/ParolArtwork.tsx', import.meta.url), 'utf8')
  const shell = readFileSync(new URL('../src/features/lantern/renderer/ProceduralOuterShell.tsx', import.meta.url), 'utf8')
  assert.ok(core.includes('data-testid="festival-mini-parol"'))
  assert.ok(core.includes('hybrid central starflower'))
  assert.ok(core.includes('Angular siku-siku tessellation'))
  assert.ok(shell.includes('data-testid="festival-regional-patterns"'))
  assert.ok(!core.includes('Five silk tails'))
  assert.ok(!shell.includes('outer-tassels'))
  assert.ok(!shell.includes('lowerRibbonAnchors'))
  assert.ok(!shell.includes('Hanging filament and cap'))
})

test('all structural growth layers are filled without gaps', () => {
  for (const count of [0, 1, 2, 3, 10, 20, 23, 35, 40, 45, 46, 50, 51, 60, 120]) {
    const layers = festivalLayers(count)
    assert.equal(layers.length, count)
    for (let i = 0; i < count; i++) {
      assert.equal(layers[i].friendNumber, i + 1)
      assert.equal(layers[i].innerRadius, outerRadiusForFriends(i))
      assert.equal(layers[i].outerRadius, outerRadiusForFriends(i + 1))
      assert.ok(Math.abs(layers[i].outerRadius - layers[i].innerRadius - growthLayerSpacing(i + 1)) < 1e-9)
      assert.equal(layers[i].zone, growthZoneForLayer(i + 1))
      const band = festivalBandPath(i + 1)
      assert.equal((band.match(/M /g) ?? []).length, 2)
      assert.equal((band.match(/ Z/g) ?? []).length, 2)
      assert.ok(!/(NaN|Infinity)/.test(band))
    }
  }
  assert.equal(festivalLayers(50).length, 50)
  assert.equal(festivalLayers(51).length, 51)
})

test('fifteen distinct ornamental regions cover the first 150 growth layers', () => {
  assert.deepEqual(GROWTH_REGIONS.slice(0, 5).map(({ from, to }) => [from, to]),
    [[1, 10], [11, 20], [21, 35], [36, 45], [46, 50]])
  assert.equal(GROWTH_REGIONS.length, 15)
  const zones = new Set(GROWTH_REGIONS.map(x => x.zone))
  assert.equal(zones.size, 15)
  for (const region of GROWTH_REGIONS) {
    for (let friend = region.from; friend <= region.to; friend++) {
      assert.equal(growthZoneForLayer(friend), region.zone)
    }
  }
  assert.equal(growthZoneForLayer(51), 'lattice')
  assert.equal(growthZoneForLayer(150), 'corona')
  assert.equal(growthZoneForLayer(151), 'corona')
})

test('all 20 glass facets per layer are finite and connected', () => {
  assert.equal(PANEL_SEGMENTS, 20)
  for (const count of [1, 2, 10, 23, 40, 50, 60]) {
    for (let sector = 0; sector < PANEL_SEGMENTS; sector++) {
      const facet = festivalFacetPath(count, sector)
      assert.ok(facet.startsWith('M '))
      assert.ok(facet.endsWith(' Z'))
      assert.equal((facet.match(/ L /g) ?? []).length, 3)
      assert.ok(!/(NaN|Infinity)/.test(facet))
    }
  }
})

test('all decorative boundaries stay nested without transparent radial gaps', () => {
  for (let count = 1; count <= 60; count++) {
    for (let step = 0; step < 360; step += 2) {
      const angle = step * Math.PI / 180
      const a = festivalPointAt(count - 1, angle)
      const b = festivalPointAt(count, angle)
      const before = Math.hypot(a.x - 300, a.y - 302)
      const after = Math.hypot(b.x - 300, b.y - 302)
      assert.ok(after > before, `layer ${count}, angle ${step} has a radial gap or overlap`)
    }
  }
})

test('completed or growing regions contain coherent flower/diamond panels', () => {
  for (const region of GROWTH_REGIONS) {
    for (const end of [region.from, region.from + Math.floor((region.to - region.from) / 2), region.to]) {
      for (let sector = 0; sector < 10; sector++) {
        const path = regionPanelPath(region.from, end, sector)
        assert.ok(path.startsWith('M '))
        assert.ok(path.endsWith(' Z'))
        assert.ok(!/(NaN|Infinity)/.test(path))
        const p = bandMotifPoint(end, sector)
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y))
      }
    }
  }
})

test('festival silhouette stays round/floral and fits even past 50 friends', () => {
  for (const count of [0, 1, 3, 10, 23, 40, 50, 51, 60, 120]) {
    const path = festivalOutlinePath(count)
    assert.ok(path.startsWith('M '))
    assert.ok(path.endsWith(' Z'))
    assert.ok(!/(NaN|Infinity)/.test(path))
    assert.ok(outerFitZoom(count) > 0)
    assert.ok(festivalMaxExtent(count) * outerFitZoom(count) < 281)
  }
  assert.ok(outerFitZoom(growthForFriends(50)) > .10)
  assert.notEqual(festivalOutlinePath(0), festivalOutlinePath(50))
  assert.equal(styles.length, 6)
  assert.equal(new Set(Object.values(OUTER_RECIPES).map(x => x.motif)).size, 6)
})

test('invalid and fractional friend counts cannot enter the renderer', () => {
  for (const invalid of [-1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => festivalLayers(invalid), RangeError)
    assert.throws(() => festivalOutlinePath(invalid), RangeError)
  }
  assert.throws(() => festivalBandPath(0), RangeError)
  assert.throws(() => festivalFacetPath(1, PANEL_SEGMENTS), RangeError)
  assert.throws(() => regionPanelPath(0, 3, 2), RangeError)
})
