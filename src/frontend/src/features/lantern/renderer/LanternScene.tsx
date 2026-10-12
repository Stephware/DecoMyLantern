import type { CSSProperties } from 'react'
import { useState } from 'react'
import { stageForFriends } from '../growth/stages'
import type { Theme } from '../../customization/themes'

type Props = { friends: number; theme: Theme }
function starPoints(outer: number, inner: number, cx = 250, cy = 250): string {
  return Array.from({ length: 10 }, (_, index) => {
    const angle = (index * Math.PI / 5) - Math.PI / 2
    const r = index % 2 ? inner : outer
    return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`
  }).join(' ')
}
export default function LanternScene({ friends, theme }: Props) {
  const [zoom, setZoom] = useState(1)
  const stage = stageForFriends(friends)
  const span = (stage.radius + 30) * 2 / zoom
  const lights = Array.from({ length: Math.min(friends, 200) }, (_, i) => {
    const angle = i * 2.399963229728653
    const ring = Math.floor(i / 15)
    const r = 23 + (ring * 14) + (i % 5) * 7
    return { x: 250 + Math.cos(angle) * Math.min(r, stage.radius * 0.78), y: 250 + Math.sin(angle) * Math.min(r, stage.radius * 0.78), color: theme.colors[i % theme.colors.length] }
  })
  const svgStyle: CSSProperties = { filter: 'drop-shadow(0 0 20px rgba(249,184,64,.16))', touchAction: 'pan-x pan-y' }
  return (
    <div className="relative mx-auto w-full max-w-[650px]" aria-label={`Parol preview with ${friends} simulated contributions`}>
      <svg role="img" aria-label={`${stage.name} parol, preview with ${friends} lights`} className="h-auto w-full select-none" viewBox={`${250 - span / 2} ${250 - span / 2} ${span} ${span}`} style={svgStyle}>
        <defs>
          <radialGradient id="centerLight"><stop offset="0%" stopColor="#fff9df" /><stop offset="50%" stopColor={theme.colors[0]} /><stop offset="100%" stopColor={theme.colors[2]} /></radialGradient>
          <filter id="bulbGlow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        {stage.requiredFriends >= 30 && <g stroke={theme.colors[1]} fill="none" opacity=".75">{Array.from({length: 20}, (_,i) => <path key={i} d="M250 76 L250 64" strokeWidth="3" transform={`rotate(${i*18} 250 250)`} />)}<circle cx="250" cy="250" r="173" strokeWidth="3" strokeDasharray="3 9"/></g>}
        {stage.requiredFriends >= 15 && <g fill="none" stroke={theme.colors[0]} strokeWidth="2.5" opacity=".85"><circle cx="250" cy="250" r="148" strokeDasharray="5 6"/>{Array.from({length: 20}, (_,i) => <circle key={i} cx="250" cy="113" r="5" fill={theme.colors[i%4]} transform={`rotate(${i*18} 250 250)`}/>)}</g>}
        {stage.requiredFriends >= 5 && <g fill="none" stroke={theme.colors[1]} strokeWidth="2.5" opacity=".8"><circle cx="250" cy="250" r="122" /><circle cx="250" cy="250" r="128" strokeDasharray="2 9"/></g>}
        <polygon points={starPoints(105, 51)} fill={theme.colors[2]} stroke={theme.colors[0]} strokeWidth="5" className="parol-glow"/>
        <polygon points={starPoints(89, 44)} fill="#111a33" stroke={theme.colors[1]} strokeWidth="2.5"/>
        <polygon points={starPoints(78, 36)} fill={theme.colors[3]} fillOpacity=".42" stroke={theme.colors[0]} strokeWidth="2"/>
        {Array.from({length:5}, (_,i) => <g key={i} transform={`rotate(${i*72} 250 250)`}><path d="M250 250 L250 153" stroke={theme.colors[1]} strokeWidth="2.5"/><path d="M250 187 l-13 24 13-9 13 9z" fill={theme.colors[i%4]} opacity=".9" /></g>)}
        <circle cx="250" cy="250" r="29" fill="url(#centerLight)" stroke="#fff7db" strokeWidth="3" filter="url(#bulbGlow)"/>
        <circle cx="250" cy="250" r="11" fill="#fffceb" opacity=".9"/>
        {lights.map((p,i) => <g key={i}><circle cx={p.x} cy={p.y} r="5" fill={p.color} filter="url(#bulbGlow)"/><circle cx={p.x} cy={p.y} r="1.5" fill="#fff" /></g>)}
        <path d="M250 356 v35" stroke={theme.colors[0]} strokeWidth="2.5" strokeDasharray="3 5"/>
        <path d="M238 390 L250 402 L262 390" fill="none" stroke={theme.colors[0]} strokeWidth="2"/>
      </svg>
      <div className="absolute bottom-1 right-1 flex items-center gap-2 rounded-full border border-white/15 bg-[#101b33]/85 p-1.5 text-sm shadow-xl backdrop-blur">
        <button type="button" className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20" aria-label="Zoom out" onClick={() => setZoom(z => Math.max(0.6, +(z - .2).toFixed(1)))}>−</button>
        <button type="button" className="min-w-14 px-1 text-amber-100" onClick={() => setZoom(1)} aria-label="Fit lantern">Fit</button>
        <button type="button" className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20" aria-label="Zoom in" onClick={() => setZoom(z => Math.min(2.8, +(z + .2).toFixed(1)))}>+</button>
      </div>
    </div>
  )
}
