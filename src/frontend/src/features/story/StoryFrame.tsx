import {THEMES} from '../customization/themes'
import {growthForFriends, outerFitZoom} from '../lantern/growth/outerGrowth'
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
export function StoryFrame({data, frame}: {data: StoryData; frame: number}) {
  const theme = THEMES.find(t => t.key === data.designKey) ?? THEMES[0]
  const capped = Math.min(50, Math.max(0, data.friendCount))
  const last = growthForFriends(capped)
  const previous = Math.max(0, last - 3)
  const wave = frame < 30 ? 0 : frame < 60 ? 1 : frame < 90 ? 2 : 3
  const count = Math.min(last, previous + wave)
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
  return (
    <div style={{
      position: 'relative', width:1080, height:1920, overflow:'hidden',
      background:'radial-gradient(ellipse at 50% 41%,#28405d 0%,#101c32 52%,#080e20 100%)',
      color:'#fff3d7', fontFamily:'Arial, Helvetica, sans-serif'
    }}>
      <div style={{position:'absolute',inset:55,border:'2px solid rgba(246,202,111,.23)',borderRadius:55}}/>
      <div style={{position:'absolute',top:145,width:'100%',textAlign:'center',opacity:headOpacity}}>
        <div style={{fontSize:35,letterSpacing:13,fontWeight:700,color:'#fbd998'}}>✦ B E M Y P A R O L ✦</div>
        <div style={{fontSize:48,marginTop:18,fontWeight:700}}>A light from every friend</div>
      </div>
      <div style={{position:'absolute',top:358,left:90,width:900,height:950,
        opacity:parolOpacity,transform:`scale(${zoom})`,transformOrigin:'center'}}>
        <div style={{position:'absolute',inset:120,borderRadius:'50%',background:'rgba(250,189,93,.19)',
          filter:'blur(115px)',opacity:sparkle}}/>
        <svg viewBox="0 0 600 640" width="900" height="950" role="img"
          aria-label="Glowing Pampanga-inspired parol" style={{overflow:'visible'}}>
          <g transform={`translate(300 302) scale(${fit}) translate(-300 -302)`}>
            <ProceduralOuterShell theme={theme} growthCount={count} pattern={data.patternKey}/>
            <ParolArtwork theme={theme} pattern={data.patternKey}/>
            {lights.slice(0, wave === 3 ? lights.length : Math.max(0, lights.length - 1)).map(slot=>{
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
      </div>
      <div style={{position:'absolute',top:1325,left:110,right:110,
        textAlign:'center',opacity:overlayOpacity}}>
        <div style={{fontSize:65,fontWeight:800,lineHeight:1.15,
          textShadow:'0 3px 22px #09101f'}}>{title}</div>
        <div style={{fontSize:43,marginTop:29,color:'#f5d28c'}}>
          {data.friendCount} {data.friendCount === 1 ? 'friend' : 'friends'} · {data.friendCount * 3} growth layers
        </div>
        <div style={{fontSize:37,marginTop:39,lineHeight:1.35}}>{subtitle}</div>
      </div>
      <div style={{position:'absolute',bottom:240,left:110,right:110,
        textAlign:'center',opacity:overlayOpacity}}>
        <div style={{height:2,background:'rgba(249,207,118,.37)',marginBottom:35}}/>
        <div style={{fontSize:36,color:'#ffe8ad',fontWeight:700}}>Find my invitation in the Link sticker ✦</div>
        <div style={{fontSize:28,marginTop:23,letterSpacing:3,color:'#c6bbad'}}>BEMYPAROL.SITE</div>
      </div>
      <div style={{position:'absolute',inset:0,pointerEvents:'none',
        background:'linear-gradient(transparent 74%,rgba(5,10,21,.26))'}}/>
    </div>
  )
}
