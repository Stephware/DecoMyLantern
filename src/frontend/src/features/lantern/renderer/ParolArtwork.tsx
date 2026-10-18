import { useId } from 'react'
import type { Theme } from '../../customization/themes'

type Props = { theme: Theme; friendCount?: number; pattern: string }

const CENTER_X = 300
const CENTER_Y = 302
const RADIANS = Math.PI / 180

function point(radius: number, angle: number): [number, number] {
  return [
    CENTER_X + Math.cos(angle * RADIANS) * radius,
    CENTER_Y + Math.sin(angle * RADIANS) * radius,
  ]
}

function starPoints(outer: number, inner: number): string {
  return Array.from({ length: 10 }, (_, i) => {
    const [x, y] = point(i % 2 === 0 ? outer : inner, -90 + i * 36)
    return `${x.toFixed(2)},${y.toFixed(2)}`
  }).join(' ')
}

function hexColor(color: string, fallback: string): string {
  return /^#[a-fA-F0-9]{6}$/.test(color) ? color : fallback
}

export default function ParolArtwork({ theme, pattern }: Props) {
  const uid = useId().replace(/:/g, '')
  const gradient = `${uid}-capiz`
  const edgeGlow = `${uid}-halo`
  const light = `${uid}-center`
  const [primary, lightTone, rose, leaf] = theme.colors
  const isFloral = theme.key === 'floral' || theme.key === 'sampaguita'
  const isFestival = theme.key === 'festival' || theme.key === 'fiesta'

  return (
    <g aria-hidden="true">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={hexColor(lightTone, '#fff0c4')} stopOpacity=".97" />
          <stop offset="46%" stopColor={hexColor(primary, '#e6ad4f')} stopOpacity=".78" />
          <stop offset="100%" stopColor={hexColor(rose, '#ab4d56')} stopOpacity=".45" />
        </linearGradient>
        <radialGradient id={light}>
          <stop offset="0%" stopColor="#fffdf2" />
          <stop offset="28%" stopColor={lightTone} />
          <stop offset="70%" stopColor={primary} />
          <stop offset="100%" stopColor={rose} stopOpacity=".45" />
        </radialGradient>
        <filter id={edgeGlow} x="-55%" y="-55%" width="210%" height="210%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      {/* The hanging cord and silk tassels now attach to the outermost
          friend layer in ProceduralOuterShell, not to the fixed center. */}

      {/* The base parol is already complete and beautiful with zero friends. */}
      <polygon points={starPoints(158, 74)} fill={primary} opacity=".32" filter={`url(#${edgeGlow})`} />
      <polygon points={starPoints(158, 74)} fill="#111b30" stroke={lightTone} strokeWidth="7" strokeLinejoin="round" />
      <polygon points={starPoints(147, 72)} fill={`url(#${gradient})`} stroke={primary} strokeWidth="2.5" strokeLinejoin="round" />
      <polygon points={starPoints(128, 61)} fill="#142237" fillOpacity=".74" stroke={lightTone} strokeWidth="2" strokeLinejoin="round" />

      {/* Five capiz-glass rays form the shared base; motifs distinguish each collection. */}
      {Array.from({ length: 5 }, (_, i) => (
        <g key={i} transform={`rotate(${i * 72} ${CENTER_X} ${CENTER_Y})`}>
          <path d="M300 299 L274 232 L300 164 L326 232 Z" fill={i % 2 ? leaf : rose} fillOpacity={isFestival ? '.68' : '.38'} stroke={lightTone} strokeWidth="1.6" />
          <path d="M300 170 L300 292 M278 234 L322 234" fill="none" stroke={lightTone} strokeWidth="1.4" opacity=".8" />
          <path d="M300 184 Q279 226 300 275 Q321 226 300 184" fill="none" stroke={primary} strokeWidth="2" opacity=".8" />
          {isFloral ? (
            <g>
              <ellipse cx="288" cy="213" rx="12" ry="21" fill={rose} fillOpacity=".75" stroke={lightTone} strokeWidth="1.4" transform="rotate(-26 288 213)" />
              <ellipse cx="312" cy="213" rx="12" ry="21" fill={rose} fillOpacity=".75" stroke={lightTone} strokeWidth="1.4" transform="rotate(26 312 213)" />
              <ellipse cx="300" cy="199" rx="10" ry="20" fill={lightTone} fillOpacity=".66" stroke={primary} strokeWidth="1.2" />
              <circle cx="300" cy="221" r="6" fill={primary} />
              <path d="M300 261 Q281 250 281 235 M300 261 Q319 250 319 235" fill="none" stroke={leaf} strokeWidth="2.4" />
            </g>
          ) : isFestival ? (
            <g>
              {[-18, -9, 0, 9, 18].map((dx, k) => <path key={dx} d={`M${300 + dx} 240 l8 -12 -8 -12 -8 12z`} fill={theme.colors[k % theme.colors.length]} stroke={lightTone} strokeWidth=".75" />)}
              <path d="M282 257 L300 237 L318 257" fill="none" stroke={rose} strokeWidth="3" strokeLinejoin="round" />
              <circle cx="300" cy="198" r="6" fill={leaf} stroke={lightTone} strokeWidth="1.7" />
            </g>
          ) : (
            <g>
              <path d="M300 194 L285 229 L300 259 L315 229 Z" fill={lightTone} fillOpacity=".44" stroke={primary} strokeWidth="2" />
              <path d="M285 229 L315 229 M300 194 L300 259" stroke={lightTone} strokeWidth="1.3" />
              <circle cx="300" cy="223" r="5" fill={rose} stroke={lightTone} strokeWidth="1.5" />
            </g>
          )}
        </g>
      ))}

      <polygon points={starPoints(105, 44)} fill="none" stroke={lightTone} strokeWidth="3.5" strokeLinejoin="round" opacity=".85" />
      <polygon points={starPoints(91, 44)} fill="none" stroke={primary} strokeWidth="2" opacity=".82" />

      {/* Optional user-selected geometry is independent of the growth milestone. */}
      {pattern === 'rings' && (
        <g fill="none" stroke={lightTone} strokeWidth="1.8" opacity=".7">
          <circle cx={CENTER_X} cy={CENTER_Y} r="115" strokeDasharray="4 8" />
          <circle cx={CENTER_X} cy={CENTER_Y} r="122" strokeDasharray="1.5 11" />
        </g>
      )}
      {pattern === 'rays' && (
        <g stroke={primary} strokeWidth="2.2" strokeLinecap="round" opacity=".78">
          {Array.from({ length: 20 }, (_, i) => (
            <path key={i} d="M300 176 L300 164" transform={`rotate(${i * 18} 300 302)`} />
          ))}
        </g>
      )}

      {/* Growth lives in ProceduralOuterShell, independent of the selected core. */}

      {/* Shared luminous rosette above the glass but behind contributed lights. */}
      <circle cx="300" cy="302" r="37" fill="#142338" fillOpacity=".9" stroke={lightTone} strokeWidth="3" />
      {Array.from({ length: 10 }, (_, i) => (
        <ellipse key={i} cx="300" cy="276" rx="8" ry="20" fill={i % 2 ? rose : primary} fillOpacity=".86" stroke={lightTone} strokeWidth="1.2" transform={`rotate(${i * 36} 300 302)`} />
      ))}
      <circle cx="300" cy="302" r="18" fill={`url(#${light})`} stroke="#fff8de" strokeWidth="3" />
      <circle cx="300" cy="302" r="6" fill="#fffbee" />
    </g>
  )
}
