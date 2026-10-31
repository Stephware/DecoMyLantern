import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp, mkdir, writeFile, stat, utimes, rm} from 'node:fs/promises'
import path from 'node:path'
import {tmpdir} from 'node:os'
import {cachedExport, pruneExports, CACHE_AGE_MS} from '../renderCache.mjs'

test('only complete and current outputs are cache hits', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'story-cache-'))
  try {
    const complete = path.join(dir, 'complete.mp4')
    const partial = path.join(dir, 'partial.mp4')
    await writeFile(complete, Buffer.alloc(2048))
    await writeFile(partial, Buffer.alloc(100))
    assert.equal(await cachedExport(complete), true)
    assert.equal(await cachedExport(partial), false)
    assert.equal(await cachedExport(path.join(dir, 'absent.mp4')), false)
    const old = (Date.now() - CACHE_AGE_MS - 1000) / 1000
    await utimes(complete, old, old)
    assert.equal(await cachedExport(complete), false)
  } finally { await rm(dir, {recursive:true, force:true}) }
})

test('startup cleanup removes abandoned jobs and bounds completed cache', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'story-cache-'))
  try {
    const abandoned = path.join(dir, 'job-abandoned')
    await mkdir(abandoned)
    await writeFile(path.join(abandoned, 'partial.mp4'), Buffer.alloc(2048))
    for (let i = 0; i < 4; i++) {
      const file = path.join(dir, `${i}.mp4`)
      await writeFile(file, Buffer.alloc(2048))
      const time = (Date.now() - (4-i)*1000) / 1000
      await utimes(file, time, time)
    }
    await pruneExports(dir, {limit:2, removeAbandoned:true})
    await assert.rejects(stat(abandoned), {code:'ENOENT'})
    await assert.rejects(stat(path.join(dir, '0.mp4')), {code:'ENOENT'})
    await assert.rejects(stat(path.join(dir, '1.mp4')), {code:'ENOENT'})
    assert.ok((await stat(path.join(dir, '3.mp4'))).isFile())
  } finally { await rm(dir, {recursive:true, force:true}) }
})

test('retention does not remove an active job created during a prior response', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'story-cache-'))
  try {
    const job = path.join(dir, 'job-active')
    await mkdir(job)
    await writeFile(path.join(job, 'output.mp4'), Buffer.alloc(100))
    await pruneExports(dir)
    assert.ok((await stat(job)).isDirectory())
  } finally { await rm(dir, {recursive:true, force:true}) }
})
