import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  validParolImage, parolImageDigest,
  PAROL_IMAGE_VERSION, PAROL_IMAGE_COMPOSITION,
} from '../parolImage.mjs'

const base = {
  designKey: 'classic', patternKey: 'default',
  friendCount: 3, slots: [0, 1, 2], format: 'webp',
}

test('only sanitized state for an approved parol is accepted', () => {
  assert.equal(validParolImage(base), true)
  assert.equal(validParolImage({...base, format: 'png'}), true)
  assert.equal(validParolImage({...base, designKey: 'unknown'}), false)
  assert.equal(validParolImage({...base, patternKey: 'evil'}), false)
  assert.equal(validParolImage({...base, format: 'svg'}), false)
  assert.equal(validParolImage({...base, slots: [0, 1, 1]}), false)
  assert.equal(validParolImage({...base, slots: [0, -1]}), false)
  assert.equal(validParolImage({...base, slots: [0, 1, 2, 3]}), false)
  assert.equal(validParolImage({...base, friendCount: -1}), false)
  assert.equal(validParolImage({...base, friendCount: 1.5}), false)
  assert.equal(validParolImage({...base, friendCount: 10001}), false)
  assert.equal(validParolImage({...base, slots: new Array(501).fill(0)}), false)
  assert.equal(validParolImage(null), false)
})

test('identical saved parol snapshots share one reusable image', () => {
  const first = parolImageDigest(base)
  assert.equal(first, parolImageDigest({...base, slots: [2, 0, 1]}))
  assert.match(first, /^[0-9a-f]{64}$/)
  assert.notEqual(first, parolImageDigest({...base, slots: [0, 1]}))
  assert.notEqual(first, parolImageDigest({...base, friendCount: 4}))
  assert.notEqual(first, parolImageDigest({...base, designKey: 'floral'}))
  assert.notEqual(first, parolImageDigest({...base, patternKey: 'rays'}))
  assert.notEqual(first, parolImageDigest({...base, format: 'png'}))
  assert.throws(() => parolImageDigest({...base, format: 'mp4'}), TypeError)
  assert.ok(PAROL_IMAGE_VERSION.includes('snapshot'))
})

test('2x zoom cache is distinct, validated, and standard image cache stays compatible', () => {
  assert.equal(validParolImage({...base, scale:1}), true)
  assert.equal(validParolImage({...base, scale:2}), true)
  assert.equal(validParolImage({...base, format:'png', scale:2}), false)
  for (const scale of [0, -1, 1.5, 3, null, '2']) {
    assert.equal(validParolImage({...base, scale}), false)
  }
  assert.equal(parolImageDigest(base), parolImageDigest({...base, scale:1}),
    'existing standard cache must not be invalidated')
  assert.notEqual(parolImageDigest(base), parolImageDigest({...base, scale:2}))
  assert.equal(parolImageDigest({...base, scale:2}),
    parolImageDigest({...base, slots:[2, 0, 1], scale:2}))
})

test('parol snapshot uses exactly the current approved artwork, not Story framing', () => {
  const composition = readFileSync(new URL('../remotionEntry.tsx', import.meta.url), 'utf8')
  const snapshot = readFileSync(
    new URL('../../src/frontend/src/features/lantern/renderer/ParolSnapshot.tsx', import.meta.url), 'utf8')
  const server = readFileSync(new URL('../server.mjs', import.meta.url), 'utf8')
  assert.equal(PAROL_IMAGE_COMPOSITION, 'BeMyParolSnapshot')
  assert.ok(composition.includes('component={ParolSnapshot}'))
  assert.ok(snapshot.includes('<ProceduralOuterShell'))
  assert.ok(snapshot.includes('<ParolArtwork'))
  assert.ok(snapshot.includes('lightPosition(slot)'))
  assert.ok(snapshot.includes('outerFitZoom(growthCount)'))
  assert.ok(server.includes("req.url === '/render-parol'"))
  assert.ok(server.includes("quality: 86"))
  assert.ok(server.includes("await rename("))
  assert.ok(server.includes("const imageDir = path.join(tmpdir(), 'bemyparol-parol-images')"))
})
