import type {StoryData} from './StoryFrame'
import {STORY_FRAMES, STORY_FPS, STORY_HEIGHT, STORY_WIDTH} from './storySpec'
import BrowserStory from './BrowserStory'

const assetUrl = '/story-assets/story-night-v2.svg'
const manifestUrl = '/story-assets/manifest.json'

export async function browserCanRenderStory(): Promise<boolean> {
  if (!window.isSecureContext || typeof VideoEncoder === 'undefined') return false
  if (!document.createElement('video').canPlayType('video/mp4; codecs="avc1.42E01F"')) return false
  const {canRenderMediaOnWeb} = await import('@remotion/web-renderer')
  const result = await canRenderMediaOnWeb({container:'mp4',videoCodec:'h264',
    width:STORY_WIDTH,height:STORY_HEIGHT,muted:true})
  return result.canRender && result.resolvedVideoCodec === 'h264'
}

function validateBrowserVideo(blob:Blob,signal:AbortSignal):Promise<void> {
  return new Promise((resolve,reject) => {
    const url=URL.createObjectURL(blob)
    const video=document.createElement('video')
    video.preload='metadata'
    let settled=false
    const finish=(error?:Error) => {
      if (settled) return
      settled=true
      clearTimeout(timer)
      signal.removeEventListener('abort',abort)
      video.removeAttribute('src')
      video.load()
      URL.revokeObjectURL(url)
      if (error) reject(error); else resolve()
    }
    const abort=()=>finish(new DOMException('Render cancelled','AbortError'))
    const timer=window.setTimeout(()=>finish(new Error('Browser video could not be verified.')),10_000)
    signal.addEventListener('abort',abort,{once:true})
    video.onloadedmetadata=()=>{
      if (video.videoWidth!==STORY_WIDTH || video.videoHeight!==STORY_HEIGHT ||
          Math.abs(video.duration-STORY_FRAMES/STORY_FPS)>.1)
        finish(new Error('Browser video did not match the Story output preset.'))
      else finish()
    }
    video.onerror=()=>finish(new Error('Browser video could not be decoded.'))
    video.src=url
  })
}

export async function renderStoryInBrowser(data: StoryData, signal: AbortSignal,
  onProgress: (phase: string, fraction: number) => void): Promise<Blob> {
  const deviceMemory=(navigator as Navigator & {deviceMemory?:number}).deviceMemory
  const safeFriends=deviceMemory!==undefined && deviceMemory>=4 ? 12 : 6
  if (data.friendCount>safeFriends || data.slots.length>safeFriends)
    throw new Error('This parol needs the server renderer to protect device memory.')
  const localController=new AbortController()
  const abort=()=>localController.abort()
  if (signal.aborted) abort()
  signal.addEventListener('abort',abort,{once:true})
  let timedOut=false
  const timer=window.setTimeout(()=>{timedOut=true;localController.abort()},120_000)
  const localSignal=localController.signal
  try {
  if (!(await browserCanRenderStory())) throw new Error('This browser cannot encode a BeMyParol MP4.')
  onProgress('Preparing video assets',0)
  const manifestResponse=await fetch(manifestUrl,{cache:'force-cache',signal:localSignal})
  if (!manifestResponse.ok) throw new Error('Story asset manifest is unavailable.')
  const manifest: {templateVersion?:string;assets?:Array<{id:string;file:string;
    sha256:string;width:number;height:number;fps:number;duration:number}>} = await manifestResponse.json()
  const night=manifest.assets?.find(item=>item.id==='story-night')
  if (manifest.templateVersion!=='story-hybrid-v2' || night?.file!=='story-night-v2.svg' ||
      night.width!==1080 || night.height!==1920 || night.fps!==STORY_FPS ||
      night.duration!==STORY_FRAMES/STORY_FPS)
    throw new Error('Story template assets are incompatible.')
  const asset = await fetch(assetUrl,{cache:'force-cache',signal:localSignal})
  if (!asset.ok || asset.headers.get('content-type')?.includes('svg') === false)
    throw new Error('Story background asset is unavailable.')
  const bytes=await asset.arrayBuffer()
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)))
    .map(value=>value.toString(16).padStart(2,'0')).join('')
  if (digest!==night.sha256) throw new Error('Story background asset failed integrity validation.')
  if (localSignal.aborted) throw new DOMException('Render cancelled','AbortError')
  const {renderMediaOnWeb} = await import('@remotion/web-renderer')
  const result = await renderMediaOnWeb({
    composition:{id:'BeMyParolStoryBrowser',component:BrowserStory,
      width:STORY_WIDTH,height:STORY_HEIGHT,fps:STORY_FPS,durationInFrames:STORY_FRAMES,
      defaultProps:data},
    inputProps:data,container:'mp4',videoCodec:'h264',muted:true,
    videoBitrate:'high',pageResponsiveness:'high',signal:localSignal,
    allowHtmlInCanvas:true,
    mediaCacheSizeInBytes:32*1024*1024,
    onProgress:({progress,encodedFrames}) =>
      onProgress(encodedFrames > 0 ? 'Encoding video' : 'Rendering on your device',progress),
  })
  const blob = await result.getBlob()
  if (localSignal.aborted) throw new DOMException('Render cancelled','AbortError')
  if (blob.type !== 'video/mp4' || blob.size < 1024)
    throw new Error('Browser generated an invalid Story video.')
  await validateBrowserVideo(blob,localSignal)
  onProgress('Video ready',1)
  return blob
  } catch(error) {
    if (timedOut) throw new Error('Device rendering exceeded the safe time limit.')
    throw error
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort',abort)
  }
}
