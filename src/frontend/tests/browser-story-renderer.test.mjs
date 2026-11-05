import {test} from 'node:test'
import assert from 'node:assert/strict'
import {existsSync, readFileSync} from 'node:fs'
import {build} from 'esbuild'

const renderer = new URL('../src/features/story/browserRenderer.tsx', import.meta.url)

test('original browser renderer is present for the optimized device path', () => {
  assert.ok(existsSync(renderer), 'Restore the original browser renderer')
})

// Stub only platform encoding and the composition mount; all selection, assets,
// cancellation and completed-file validation execute the production renderer.
async function loadRenderer() {
  const result = await build({entryPoints:[renderer.pathname], bundle:true, write:false,
    format:'esm', platform:'browser', plugins:[{name:'browser-platform', setup(build) {
      build.onResolve({filter:/^@remotion\/web-renderer$/}, () => ({path:'encoder',namespace:'test'}))
      build.onResolve({filter:/^\.\/BrowserStory$/}, () => ({path:'story',namespace:'test'}))
      build.onLoad({filter:/.*/,namespace:'test'}, ({path}) => ({contents:path === 'story'
        ? 'export default function BrowserStory() {}'
        : 'export const canRenderMediaOnWeb = (...args) => globalThis.storyEncoder.canRender(...args); export const renderMediaOnWeb = (...args) => globalThis.storyEncoder.render(...args);',loader:'js'}))
    }}]})
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'))
}

const data = {kind:'owner',designKey:'classic',patternKey:'default',friendCount:0,slots:[],highlightSlot:null}

async function withBrowser(run, {metadata={videoWidth:720,videoHeight:1280,duration:8}, timeout=false, memory=4}={}) {
  const originals = new Map(['window','document','navigator','VideoEncoder','fetch','storyEncoder']
    .map(name => [name,Object.getOwnPropertyDescriptor(globalThis,name)]))
  const document = new EventTarget()
  document.hidden = false
  document.createElement = () => {
    const video = {canPlayType:()=> 'probably', removeAttribute() {}, load() {}, ...metadata}
    Object.defineProperty(video,'src',{set() {queueMicrotask(() => video.onloadedmetadata?.())}})
    return video
  }
  const manifest = JSON.parse(readFileSync(new URL('../public/story-assets/manifest.json',import.meta.url),'utf8'))
  const asset = readFileSync(new URL('../public/story-assets/story-night-v2.svg',import.meta.url))
  const state={document,calls:[],renderOptions:null,manifest,asset}
  const browser = {isSecureContext:true,setTimeout:(callback, delay) => setTimeout(callback,timeout && delay===120_000 ? 0 : delay)}
  const encoder={canRender:async () => ({canRender:true,resolvedVideoCodec:'h264'}),render:async options => {
    state.renderOptions=options
    return {getBlob:async () => new Blob([new Uint8Array(2048)],{type:'video/mp4'})}
  }}
  for (const [name,value] of Object.entries({window:browser,document,navigator:{deviceMemory:memory},VideoEncoder:class {},storyEncoder:encoder,
    fetch:async (url,options) => {
      state.calls.push({url,options})
      return url.endsWith('manifest.json') ? Response.json(state.manifest)
        : new Response(state.asset,{headers:{'content-type':'image/svg+xml'}})
    }})) Object.defineProperty(globalThis,name,{configurable:true,writable:true,value})
  try {await run(await loadRenderer(),state,encoder)} finally {
    for (const [name,descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis,name,descriptor)
      else delete globalThis[name]
    }
  }
}

// Regression target: weakening the size guard would start expensive device work.
test('large parols reject before encoding or asset requests',async () => {
  await withBrowser(async ({renderStoryInBrowser}, state) => {
    await assert.rejects(renderStoryInBrowser({...data,friendCount:13},new AbortController().signal,()=>{}),/protect device memory/)
    await assert.rejects(renderStoryInBrowser({...data,slots:Array.from({length:13},(_,i)=>i)},new AbortController().signal,()=>{}),/protect device memory/)
    assert.equal(state.calls.length,0)
  })
})

test('hidden and already-cancelled rendering rejects with AbortError',async () => {
  await withBrowser(async ({renderStoryInBrowser},state) => {
    state.document.hidden=true
    await assert.rejects(renderStoryInBrowser(data,new AbortController().signal,()=>{}),{name:'AbortError'})
    state.document.hidden=false
    const controller=new AbortController()
    controller.abort()
    await assert.rejects(renderStoryInBrowser(data,controller.signal,()=>{}),{name:'AbortError'})
    assert.equal(state.calls.length,0)
  })
})

test('asset mismatch fails before encoding',async () => {
  await withBrowser(async ({renderStoryInBrowser},state) => {
    state.manifest.assets[0].sha256='bad'
    await assert.rejects(renderStoryInBrowser(data,new AbortController().signal,()=>{}),/integrity validation/)
    assert.equal(state.renderOptions,null)
  })
})

test('successful device output uses original preset and validated playback metadata',async () => {
  await withBrowser(async ({renderStoryInBrowser},state) => {
    const progress=[]
    const blob=await renderStoryInBrowser(data,new AbortController().signal,(...event)=>progress.push(event))
    assert.equal(blob.type,'video/mp4')
    assert.deepEqual([state.renderOptions.composition.width,state.renderOptions.composition.height,
      state.renderOptions.composition.fps,state.renderOptions.composition.durationInFrames],[720,1280,24,192])
    assert.equal(state.renderOptions.mediaCacheSizeInBytes,32*1024*1024)
    assert.equal(state.renderOptions.muted,true)
    assert.equal(state.calls.length,2)
    assert.deepEqual(progress.at(-1),['Video ready',1])
  })
})

test('incorrect MP4 dimensions are rejected before exposing a file',async () => {
  await withBrowser(async ({renderStoryInBrowser}) => {
    await assert.rejects(renderStoryInBrowser(data,new AbortController().signal,()=>{}),/output preset/)
  },{metadata:{videoWidth:1080,videoHeight:1920,duration:8}})
})

test('tab hiding aborts in-flight encoding without disguising cancellation as failure',async () => {
  await withBrowser(async ({renderStoryInBrowser},state,encoder) => {
    encoder.render=options => new Promise((resolve,reject) => {
      options.signal.addEventListener('abort',()=>reject(new Error('renderMediaOnWeb() was cancelled')),{once:true})
      state.document.hidden=true
      state.document.dispatchEvent(new Event('visibilitychange'))
    })
    await assert.rejects(renderStoryInBrowser(data,new AbortController().signal,()=>{}),{name:'AbortError'})
  })
})

test('device deadline aborts encoding and remains eligible for server fallback',async () => {
  await withBrowser(async ({renderStoryInBrowser},state,encoder) => {
    encoder.render=options => new Promise((resolve,reject) => {
      options.signal.addEventListener('abort',()=>reject(new Error('renderMediaOnWeb() was cancelled')),{once:true})
    })
    await assert.rejects(renderStoryInBrowser(data,new AbortController().signal,()=>{}),/safe time limit/)
  },{timeout:true})
})


test('unknown-memory and low-memory devices keep the six-friend safety cap',async () => {
  for (const memory of [null,2]) {
    await withBrowser(async ({renderStoryInBrowser},state) => {
      if (memory === null) delete globalThis.navigator.deviceMemory
      await assert.rejects(renderStoryInBrowser({...data,friendCount:7},new AbortController().signal,()=>{}),/protect device memory/)
      assert.equal(state.calls.length,0)
    },{memory})
  }
})

test('unsupported encoding returns control before downloading template assets',async () => {
  await withBrowser(async ({renderStoryInBrowser},state,encoder) => {
    encoder.canRender=async () => ({canRender:false,resolvedVideoCodec:null})
    await assert.rejects(renderStoryInBrowser(data,new AbortController().signal,()=>{}),/cannot encode/)
    assert.equal(state.calls.length,0)
  })
})

test('local PNG keeps completed high-resolution artwork and validates the real PNG signature', async () => {
  const output=await build({entryPoints:[new URL('../src/features/story/phoneStoryVideo.ts',import.meta.url).pathname],
    bundle:true,write:false,format:'esm',platform:'node',jsx:'automatic',
    banner:{js:"import {createRequire} from 'node:module'; const require=createRequire(" + JSON.stringify(new URL('../package.json',import.meta.url).pathname) + ");"},
    plugins:[{name:'unused-video',setup(build) {
      build.onResolve({filter:/^\.\/browserRenderer$/},()=>({path:'unused',namespace:'test'}))
      build.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const browserCanRenderStory=async()=>false; export const renderStoryInBrowser=async()=>{};',loader:'js'}))
    }}]})
  const {renderStoryImageOnDevice}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'))
  const originals=new Map(['window','document','Image'].map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]))
  let paints=0
  const captured=[]
  const originalCreate=URL.createObjectURL
  const originalRevoke=URL.revokeObjectURL
  const canvas={width:0,height:0,getContext:()=>({clearRect(){},drawImage(){paints++},
    getImageData:()=>({data:new Uint8Array([paints*40,80,120,255])})}),
    toBlob:callback=>{
      const bytes=new Uint8Array(2048)
      bytes.set([137,80,78,71,13,10,26,10])
      callback(new Blob([bytes],{type:'image/png'}))
    }}
  URL.createObjectURL=blob=>{captured.push(blob);return 'blob:png-test'}
  URL.revokeObjectURL=()=>{}
  for (const [name,value] of Object.entries({window:{setTimeout,clearTimeout},document:{hidden:false,createElement:()=>canvas},Image:class {async decode(){}}}))
    Object.defineProperty(globalThis,name,{configurable:true,writable:true,value})
  try {
    const png=await renderStoryImageOnDevice(data,new AbortController().signal)
    assert.equal(png.type,'image/png')
    assert.equal(captured.length,2)
    for (const blob of captured) {
      const svg=await blob.text()
      assert.match(svg, /width="1080" height="1920" viewBox="0 0 1080 1920"/)
      assert.doesNotMatch(svg, /<img\b/)
      assert.doesNotMatch(svg, /<svg[^>]*xmlns="[^"]*"[^>]*xmlns=/)
    }
    assert.match(await captured[1].text(),/Help my parol shine!/)
    assert.equal(canvas.width,0)
    assert.equal(canvas.height,0)
  } finally {
    URL.createObjectURL=originalCreate
    URL.revokeObjectURL=originalRevoke
    for (const [name,descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis,name,descriptor)
      else delete globalThis[name]
    }
  }
})
