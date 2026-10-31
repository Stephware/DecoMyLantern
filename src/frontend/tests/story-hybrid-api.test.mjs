import {test} from 'node:test'
import assert from 'node:assert/strict'
import {fetchStoryComposition,startStoryJob,storyJobStatus,storyJobFile,cancelStoryJob} from '../src/lib/api.ts'

function fakeServer(handler) {
  const original=globalThis.fetch
  const requests=[]
  globalThis.fetch=async(path,options={})=>{
    requests.push({path,options})
    if (String(path).endsWith('/csrf'))
      return Response.json({token:'csrf-for-test'})
    return handler(path,options)
  }
  return {requests,restore:()=>{globalThis.fetch=original}}
}

const composition={kind:'friend',designKey:'classic',patternKey:'default',
  friendCount:1,slots:[7],highlightSlot:7,format:'mp4'}

test('guest composition and jobs keep invitation proof and CSRF on every request',async()=>{
  const server=fakeServer((path)=>{
    if (String(path).endsWith('/composition')) return Response.json(composition)
    if (String(path).endsWith('/jobs/file'))
      return new Response(new Blob([new Uint8Array([1,2,3])],{type:'video/mp4'}),
        {headers:{'Content-Type':'video/mp4'}})
    return Response.json({id:'00000000-0000-4000-8000-000000000001',
      status:'completed',progress:1,position:0,error:null})
  })
  try {
    assert.deepEqual(await fetchStoryComposition('friend','abcdefghijklmnop'),composition)
    const job=await startStoryJob('friend','abcdefghijklmnop')
    assert.equal(job.status,'completed')
    assert.equal((await storyJobStatus('friend',job.id,'abcdefghijklmnop')).id,job.id)
    assert.equal((await storyJobFile('friend',job.id,'abcdefghijklmnop')).type,'video/mp4')
    await cancelStoryJob('friend',job.id,'abcdefghijklmnop')
    const posts=server.requests.filter(item=>!String(item.path).endsWith('/csrf'))
    assert.equal(posts.length,5)
    for(const post of posts){
      assert.equal(post.options.headers['X-CSRF-TOKEN'],'csrf-for-test')
      assert.equal(post.options.credentials,'same-origin')
      assert.equal(JSON.parse(post.options.body).token,'abcdefghijklmnop')
    }
    assert.equal(posts[0].path,'/api/invitations/story/composition')
    assert.equal(posts[1].path,'/api/invitations/story/jobs/start')
    assert.equal(posts[2].path,'/api/invitations/story/jobs/status')
    assert.equal(posts[3].path,'/api/invitations/story/jobs/file')
    assert.equal(posts[4].path,'/api/invitations/story/jobs/cancel')
  } finally {server.restore()}
})

test('browser composition rejects invalid saved geometry and absent guest token',async()=>{
  const server=fakeServer(()=>Response.json({...composition,slots:[-1]}))
  try {
    await assert.rejects(fetchStoryComposition('friend'),/Missing invitation/)
    await assert.rejects(fetchStoryComposition('friend','abcdefghijklmnop'),/invalid Story composition/)
  } finally {server.restore()}
})
