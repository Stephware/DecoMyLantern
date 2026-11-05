import {test} from 'node:test'
import assert from 'node:assert/strict'
import {fetchStoryComposition} from '../src/lib/api.ts'

for (const kind of ['owner','friend']) test(`composition fetch uses ${kind} authentication and sends no design or video`, async () => {
  const original=globalThis.fetch
  const calls=[]
  const signal=new AbortController().signal
  globalThis.fetch=async (url, init) => {
    calls.push({url,init})
    return Response.json(url.endsWith('/csrf') ? {token:'csrf-value'} :
      {kind,designKey:'classic',patternKey:'default',friendCount:0,slots:[],highlightSlot:null})
  }
  try {
    const data=await fetchStoryComposition(kind,kind==='friend'?'abcdefghijklmnop':undefined,signal)
    assert.equal(data.kind,kind)
    assert.equal(calls.length,2)
    assert.equal(calls[0].url,kind==='friend'?'/api/invitations/csrf':'/api/owner/csrf')
    assert.equal(calls[1].url,kind==='friend'?'/api/invitations/story/composition':'/api/my/lantern/story/composition')
    assert.equal(calls[1].init.credentials,'same-origin')
    assert.equal(calls[1].init.cache,'no-store')
    assert.equal(calls[1].init.signal,signal)
    assert.equal(calls[1].init.headers.get('X-CSRF-TOKEN'),'csrf-value')
    assert.deepEqual(JSON.parse(calls[1].init.body),kind==='friend'?{token:'abcdefghijklmnop'}:{})
  } finally {globalThis.fetch=original}
})

test('guest composition requires an invitation before any request',async()=>{
  await assert.rejects(fetchStoryComposition('friend'),/Missing invitation/)
})
