import {test} from 'node:test'
import assert from 'node:assert/strict'
import {RenderQueue} from '../renderQueue.mjs'

const tick = () => new Promise(resolve => setImmediate(resolve))

test('queue admits one active and bounded pending work, deduplicating callers', async () => {
  const queue = new RenderQueue({maxPending:1})
  const releases = []
  let started = 0
  const run = () => { started++; return new Promise(resolve => releases.push(resolve)) }
  const first = queue.submit('same','/a.mp4',run)
  const duplicate = queue.submit('same','/a.mp4',run)
  await tick()
  assert.notEqual(first.id,duplicate.id)
  assert.equal(started,1)
  assert.equal(queue.describe(duplicate.id).status,'rendering')
  const second = queue.submit('other','/b.mp4',run)
  assert.equal(queue.describe(second.id).status,'queued')
  assert.equal(queue.submit('overflow','/c.mp4',run),null)
  releases.shift()()
  await tick()
  await tick()
  assert.equal(queue.describe(first.id).status,'completed')
  assert.equal(queue.file(first.id),'/a.mp4')
  assert.equal(started,2)
  releases.shift()()
  await tick()
})

test('cancelling one duplicate handle does not cancel shared work', async () => {
  const queue = new RenderQueue()
  let aborted = false
  let release
  const run = signal => new Promise(resolve => {
    release=resolve
    signal.addEventListener('abort',()=>{aborted=true;resolve()})
  })
  const a=queue.submit('a','/a.mp4',run)
  const b=queue.submit('a','/a.mp4',run)
  await tick()
  assert.equal(queue.cancel(a.id),true)
  assert.equal(aborted,false)
  assert.equal(queue.describe(a.id).status,'cancelled')
  release()
  await tick()
  assert.equal(queue.describe(b.id).status,'completed')
})

test('last subscriber cancellation aborts rendering and frees the slot', async () => {
  const queue=new RenderQueue({maxPending:1})
  let didAbort=false
  const a=queue.submit('a','/a.mp4',signal=>new Promise(resolve=>
    signal.addEventListener('abort',()=>{didAbort=true;resolve()},{once:true})))
  await tick()
  queue.cancel(a.id)
  await tick()
  assert.equal(didAbort,true)
  assert.equal(queue.active,0)
  const b=queue.submit('b','/b.mp4',async()=>{})
  await tick()
  assert.equal(queue.describe(b.id).status,'completed')
})
