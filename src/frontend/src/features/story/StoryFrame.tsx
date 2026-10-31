import {THEMES} from '../customization/themes'
import {festivalOutlinePath, festivalPointAt, outerFitZoom} from '../lantern/growth/outerGrowth'
import {storyGrowthAtFrame} from './storySpec'
import ParolArtwork from '../lantern/renderer/ParolArtwork'
import ProceduralOuterShell from '../lantern/renderer/ProceduralOuterShell'
import {lightPosition} from '../lantern/renderer/lightPositions'

export type StoryKind = 'owner' | 'friend'
export type StoryFormat = 'mp4' | 'png'
export type StoryData = {
  kind: StoryKind
  designKey: string
  patternKey: string
  friendCount: number
  slots: number[]
  highlightSlot: number | null
}

/** Shared by the website's poster and the Remotion MP4/PNG renderer.
 * Frames are deterministic; no DOM timers, browser recording or private data.
 */
export type StoryLayer = 'all' | 'background' | 'parol' | 'flash' | 'text'

export function StoryFrame({data, frame, layer = 'all'}: {data: StoryData; frame: number; layer?: StoryLayer}) {
  const theme = THEMES.find(t => t.key === data.designKey) ?? THEMES[0]
  const count = storyGrowthAtFrame(data.friendCount, frame)
  const wave = frame < 30 ? 0 : frame < 60 ? 1 : frame < 90 ? 2 : 3
  const fit = outerFitZoom(count)
  const zoom = 1.12 - 0.12 * Math.min(1, Math.max(0, (frame - 96) / 55))
  const parolOpacity = Math.min(1, Math.max(0, (frame - 4) / 22))
  const overlayOpacity = Math.min(1, Math.max(0, (frame - 155) / 26))
  const headOpacity = Math.min(1, frame / 24)
  const lights = data.slots.filter(slot => slot >= 0 && slot <= 100000)
  const title = data.kind === 'friend' ? 'I added my light!' : 'Help my parol shine!'
  const subtitle = data.kind === 'friend'
    ? 'Add your own light to our Christmas parol'
    : 'Add your light to my Christmas parol'
  const sparkle = 0.65 + 0.35 * Math.cos(frame * 0.12)
  const waveAge = frame < 30 ? 50 : frame < 60 ? frame-30 : frame < 90 ? frame-60 : frame-90
  const waveFlash = frame < 30 || frame >= 122 ? 0 : Math.max(0, 1-waveAge/25)
  return (
    <div style={{
      position: 'relative', width:1080, height:1920, overflow:'hidden',
      background: layer === 'all' || layer === 'background'
        ? 'radial-gradient(ellipse at 50% 41%,#28405d 0%,#101c32 52%,#080e20 100%)'
        : 'transparent',
      color:'#fff3d7', fontFamily:'Arial, Helvetica, sans-serif'
    }}>
      {(layer === 'all' || layer === 'background') && <div style={{position:'absolute',inset:55,border:'2px solid rgba(246,202,111,.23)',borderRadius:55}}/>}
      {(layer === 'all' || layer === 'background') && <div style={{position:'absolute',top:145,width:'100%',textAlign:'center',opacity:headOpacity}}>
        <div style={{fontSize:35,letterSpacing:13,fontWeight:700,color:'#fbd998'}}>✦ B E M Y P A R O L ✦</div>
        <div style={{fontSize:48,marginTop:18,fontWeight:700}}>A light from every friend</div>
      </div>}
      {(layer === 'all' || layer === 'background' || layer === 'parol' || layer === 'flash') && <div style={{position:'absolute',top:325,left:120,width:840,height:890,
        opacity:layer === 'all' || layer === 'background' ? parolOpacity : 1,
        transform:layer === 'all' || layer === 'background' ? `scale(${zoom})` : undefined,
        transformOrigin:'center'}}>
        {(layer === 'all' || layer === 'background') && <div style={{position:'absolute',inset:120,borderRadius:'50%',background:'rgba(250,189,93,.19)',
          filter:'blur(115px)',opacity:sparkle}}/>}
        {layer !== 'background' && <>
        <svg viewBox="0 0 600 640" width="840" height="890" role="img"
          aria-label="Glowing Pampanga-inspired parol" style={{overflow:'visible'}}>
          <g transform={`translate(300 302) scale(${fit}) translate(-300 -302)`}>
            {layer !== 'flash' && <>
              <ProceduralOuterShell theme={theme} growthCount={count} pattern={data.patternKey}/>
              <ParolArtwork theme={theme} pattern={data.patternKey}/>
            </>}
            {(layer === 'flash' || layer === 'all') && waveFlash > 0 && <g opacity={waveFlash} aria-hidden="true">
              <path d={festivalOutlinePath(count)} fill="none" stroke="#fff5bf"
                strokeWidth={5 + 9*waveFlash}/>
              {Array.from({length:20},(_,index)=>{
                const p=festivalPointAt(count, -Math.PI/2 + index*Math.PI/10)
                return <g key={index} transform={`translate(${p.x} ${p.y})`}>
                  <path d="M 0 -9 L 3 -3 L 9 0 L 3 3 L 0 9 L -3 3 L -9 0 L -3 -3 Z"
                    fill={index%2===0 ? '#fff9d4' : theme.colors[0]}
                    transform={`scale(${.5 + waveFlash})`}/>
                </g>
              })}
            </g>}
            {layer !== 'flash' && lights.slice(0, wave === 3 ? lights.length : Math.max(0, lights.length - 1)).map(slot=>{
              const point=lightPosition(slot)
              const chosen=slot === data.highlightSlot
              const color=theme.colors[slot % theme.colors.length]
              return <g key={slot}>
                <circle cx={point.x} cy={point.y} r={point.radius * (chosen ? 6 : 2.8)}
                  fill={color} opacity={chosen ? .65 : .28}/>
                <circle cx={point.x} cy={point.y} r={point.radius * (chosen ? 2.1 : 1)}
                  fill="#fff9e6" stroke={color} strokeWidth="1.1"/>
              </g>
            })}
          </g>
        </svg>
        </>}
      </div>}
      {(layer === 'all' || layer === 'text') && <div style={{position:'absolute',top:1225,left:110,right:110,
        textAlign:'center',opacity:layer === 'all' ? overlayOpacity : 1}}>
        <div style={{fontSize:65,fontWeight:800,lineHeight:1.15,
          textShadow:'0 3px 22px #09101f'}}>{title}</div>
        <div style={{fontSize:43,marginTop:29,color:'#f5d28c'}}>
          {data.friendCount} {data.friendCount === 1 ? 'friend' : 'friends'}
        </div>
        <div style={{fontSize:37,marginTop:39,lineHeight:1.35}}>{subtitle}</div>
      </div>}
      {(layer === 'all' || layer === 'text') && <div style={{position:'absolute',bottom:240,left:110,right:110,
        textAlign:'center',opacity:layer === 'all' ? overlayOpacity : 1}}>
        <div style={{height:2,background:'rgba(249,207,118,.37)',marginBottom:35}}/>
        <div style={{fontSize:36,color:'#ffe8ad',fontWeight:700}}>Find my invitation in the Link sticker ✦</div>
        <div style={{fontSize:28,marginTop:23,letterSpacing:3,color:'#c6bbad'}}>BEMYPAROL.SITE</div>
      </div>}
      {(layer === 'all' || layer === 'background') && <div style={{position:'absolute',inset:0,pointerEvents:'none',
        background:'linear-gradient(transparent 74%,rgba(5,10,21,.26))'}}/>}
    </div>
  )
}
