import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp, writeFile, readFile, rm, stat, utimes} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'
import {createStoryVideoJobs, storyVideoDigest} from '../storyVideoJobs.mjs'

const payload = {
  kind:'owner', designKey:'classic', patternKey:'default', friendCount:1,
  slots:[0], highlightSlot:null, format:'mp4',
}

async function fixture(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), 'bemyparol-jobs-test-'))
  try { await fn(dir) } finally { await rm(dir, {recursive:true, force:true}) }
}
async function waitUntil(check) {
  for (let i=0;i<100;i++) {
    if (await check()) return
    await delay(20)
  }
  assert.fail('background video did not finish')
}

test('stable job identity uses canonical saved parol, not a public job ID', () => {
  assert.match(storyVideoDigest(payload), /^[0-9a-f]{64}$/)
  assert.equal(storyVideoDigest(payload), storyVideoDigest({...payload}))
  assert.notEqual(storyVideoDigest(payload), storyVideoDigest({...payload, friendCount:2}))
  assert.notEqual(storyVideoDigest(payload), storyVideoDigest({...payload, slots:[0,1]}))
  assert.notEqual(storyVideoDigest(payload), storyVideoDigest({...payload, designKey:'floral'}))
})

test('browser can leave and later obtain ready video, without duplicate rendering', async () => {
  await fixture(async dir => {
    let busy = false, calls = 0
    const setup = () => createStoryVideoJobs({
      renderDir:dir, isBusy:()=>busy, setBusy:value=>{busy=value},
      renderVideo:async (_props, output) => {
        calls++
        await delay(30)
        await writeFile(output, Buffer.alloc(2048, 5))
      },
    })
    const jobs = setup()
    assert.equal((await jobs.status(payload)).status, 'not_found')
    const first = await jobs.start(payload)
    assert.ok(['queued','rendering'].includes(first.status))
    await jobs.start(payload) // Double-click should not create another render.
    await waitUntil(async () => (await jobs.status(payload)).status === 'ready')
    assert.equal(calls, 1)
    assert.equal((await stat(jobs.filename(payload))).size, 2048)
    // Represents reopening the UI or restarting the renderer with the same files.
    const later = setup()
    assert.equal((await later.status(payload)).status, 'ready')
    assert.deepEqual(await readFile(later.filename(payload)), Buffer.alloc(2048, 5))
    assert.equal((await later.start(payload)).status, 'ready')
    assert.equal(calls, 1)
  })
})

test('busy renderer queues jobs and a subsequent status request sees their progress', async () => {
  await fixture(async dir => {
    let busy = true
    const jobs = createStoryVideoJobs({
      renderDir:dir, isBusy:()=>busy, setBusy:value=>{busy=value},
      renderVideo:async (_props, output)=>writeFile(output, Buffer.alloc(2000)),
    })
    assert.equal((await jobs.start(payload)).status, 'queued')
    assert.equal((await jobs.status(payload)).status, 'queued')
    busy = false
    await waitUntil(async () => (await jobs.status(payload)).status === 'ready')
  })
})

test('failed or expired render is retryable and never reports missing file as ready', async () => {
  await fixture(async dir => {
    let busy = false, calls = 0
    const jobs = createStoryVideoJobs({
      renderDir:dir, isBusy:()=>busy, setBusy:value=>{busy=value}, ttlMs:50,
      renderVideo:async (_props, output) => {
        calls++
        if(calls===1) throw Error('simulated renderer failure')
        await writeFile(output, Buffer.alloc(2000))
      },
    })
    await jobs.start(payload)
    await waitUntil(async()=> (await jobs.status(payload)).status==='failed')
    await jobs.start(payload)
    await waitUntil(async()=> (await jobs.status(payload)).status==='ready')
    const stale = new Date(Date.now()-10_000)
    await utimes(jobs.filename(payload), stale, stale)
    assert.equal((await jobs.status(payload)).status,'not_found')
  })
})

test('queue capacity is bounded and rejects new distinct work', async () => {
  await fixture(async dir => {
    let busy=true
    const jobs = createStoryVideoJobs({
      renderDir:dir, isBusy:()=>busy, setBusy:v=>{busy=v},
      maxQueued:1, renderVideo:async (_props, output)=>writeFile(output, Buffer.alloc(2048)),
    })
    assert.equal((await jobs.start(payload)).status,'queued')
    assert.equal((await jobs.start({...payload,friendCount:2,slots:[0,1]})).status,'busy')
    busy=false
    await waitUntil(async()=> (await jobs.status(payload)).status==='ready')
  })
})
