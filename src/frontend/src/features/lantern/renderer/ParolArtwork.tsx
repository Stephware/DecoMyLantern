import { useId } from 'react'
import type { Theme } from '../../customization/themes'
import {
  BASE_FESTIVAL_RADIUS,
  festivalOutlinePath,
} from '../growth/outerGrowth'

type Props = { theme: Theme; friendCount?: number; pattern: string }

const CENTER_X = 300
const CENTER_Y = 302
const TAU = Math.PI * 2

function polar(radius: number, angle: number): { x: number; y: number } {
  return {
    x: CENTER_X + radius * Math.cos(angle),
    y: CENTER_Y + radius * Math.sin(angle),
  }
}

function starPoints(outer: number, inner: number): string {
  return Array.from({ length: 20 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 10
    const radius = index % 2 === 0 ? outer : inner
    const { x, y } = polar(radius, angle)
    return `${x.toFixed(2)},${y.toFixed(2)}`
  }).join(' ')
}

/**
 * The zero-friend parol is already a complete miniature Ligligan Parul:
 * a round/floral illuminated frame, capiz mosaic, siku-siku diamonds,
 * ten surrounding fan windows, and a hybrid starburst-floral tambor.
 * Not a lone star waiting for outer layers. No tail or hanging ribbon.
 */
export default function ParolArtwork({ theme, pattern }: Props) {
  const uid = useId().replace(/:/g, '')
  const [gold, ivory, rose, jade] = theme.colors
  const colors = [gold, rose, jade, ivory] as const
  const capiz = `url(#${uid}-base-glass)`
  const centerGlow = `url(#${uid}-tambor-glow)`
  const baseOutline = festivalOutlinePath(0)

  return (
    <g data-testid="festival-mini-parol" data-base-radius={BASE_FESTIVAL_RADIUS}
      aria-hidden="true">
      <defs>
        <radialGradient id={`${uid}-base-glass`}>
          <stop offset="0%" stopColor={ivory} stopOpacity=".78"/>
          <stop offset="45%" stopColor={gold} stopOpacity=".5"/>
          <stop offset="100%" stopColor={jade} stopOpacity=".45"/>
        </radialGradient>
        <radialGradient id={`${uid}-tambor-glow`}>
          <stop offset="0%" stopColor="#fffef4"/>
          <stop offset="27%" stopColor={ivory}/>
          <stop offset="68%" stopColor={gold} stopOpacity=".8"/>
          <stop offset="100%" stopColor={rose} stopOpacity=".1"/>
        </radialGradient>
        <filter id={`${uid}-base-glow`} x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="3"/>
        </filter>
      </defs>
      <path d={baseOutline} fill="#293448" stroke={ivory}
        strokeWidth="5" strokeLinejoin="round" />
      <path d={baseOutline} fill="none" stroke={gold} strokeWidth="10"
        strokeOpacity=".26" filter={`url(#${uid}-base-glow)`}/>

      {/* A compact wreath of twenty dyed capiz floral windows. Every sector
          touches its neighbors so the mini lantern reads as complete. */}
      {Array.from({ length: 20 }, (_, sector) => (
        <g key={sector} transform={`rotate(${sector * 18} 300 302)`}>
          <path d="M 289 164 L 300 146 L 311 164 L 312 198 L 300 211 L 288 198 Z"
            fill={colors[Math.floor(sector / 2) % colors.length]}
            fillOpacity=".62" stroke={ivory} strokeWidth="1.45"/>
          <path d="M 300 152 L 300 206 M 290 187 L 310 187"
            fill="none" stroke={gold} strokeWidth=".9" opacity=".76"/>
          <path d="M 290 159 Q 300 147 310 159"
            fill="none" stroke={ivory} strokeWidth=".95" opacity=".76"/>
          <circle cx="300" cy="154" r={sector % 5 === 0 ? 3.2 : 2}
            fill={ivory} stroke={gold} strokeWidth=".65"/>
        </g>
      ))}

      {/* Angular siku-siku tessellation between the outer glass windows and
          the tambor: colored diamonds, crossed foil ribs and jewel points. */}
      {Array.from({ length: 10 }, (_, sector) => (
        <g key={sector} transform={`rotate(${sector * 36} 300 302)`}>
          <path d="M 300 196 L 319 216 L 300 247 L 281 216 Z"
            fill={sector % 2 ? jade : rose}
            fillOpacity=".7" stroke={ivory} strokeWidth="1.6"/>
          <path d="M 300 201 L 300 241 M 284 217 L 316 217"
            fill="none" stroke={gold} strokeWidth="1.2" opacity=".88"/>
          <path d="M 288 232 Q 300 210 312 232"
            fill="none" stroke={ivory} strokeWidth="1.1" opacity=".75"/>
          <circle cx="300" cy="215" r="3.1" fill={ivory} stroke={gold} strokeWidth=".8"/>
        </g>
      ))}

      {/* Ten embroidered fan windows around the hybrid central starflower. */}
      {Array.from({ length: 10 }, (_, sector) => (
        <g key={sector} transform={`rotate(${sector * 36} 300 302)`}>
          <path d="M 284 248 Q 276 229 300 208 Q 324 229 316 248
            L 300 269 Z"
            fill={capiz} stroke={ivory} strokeWidth="1.7"
            strokeLinejoin="round"/>
          <path d="M 300 211 L 300 264 M 289 240 L 300 213 L 311 240"
            fill="none" stroke={rose} strokeWidth="1.25" opacity=".8"/>
          <path d="M 287 251 Q 300 235 313 251"
            fill="none" stroke={gold} strokeWidth="1.2"/>
          <circle cx="300" cy="229" r="2.3" fill={gold}/>
        </g>
      ))}

      {/* A floral tambor with a compact twenty-ray starburst:
          both geometrically strong and soft like real festival parols. */}
      <circle cx={CENTER_X} cy={CENTER_Y} r="63"
        fill="#263548" stroke={gold} strokeWidth="3.2" />
      <polygon points={starPoints(58, 33)} fill={rose}
        fillOpacity=".67" stroke={ivory} strokeWidth="2.4"/>
      <polygon points={starPoints(48, 28)} fill={capiz}
        stroke={gold} strokeWidth="1.4"/>
      {Array.from({ length: 10 }, (_, sector) => (
        <g key={sector} transform={`rotate(${sector * 36} 300 302)`}>
          <ellipse cx="300" cy="275" rx="7.5" ry="18"
            fill={sector % 2 === 0 ? rose : jade}
            fillOpacity=".86" stroke={ivory} strokeWidth="1.3"/>
          <path d="M 300 262 L 300 288"
            fill="none" stroke={gold} strokeWidth=".9"/>
        </g>
      ))}
      <circle cx={CENTER_X} cy={CENTER_Y} r="29"
        fill="#343445" stroke={ivory} strokeWidth="2.5"/>
      {Array.from({ length: 10 }, (_, sector) => (
        <ellipse key={sector} cx={CENTER_X} cy={CENTER_Y - 14}
          rx="5" ry="11" transform={`rotate(${sector * 36} 300 302)`}
          fill={sector % 2 ? ivory : gold}
          fillOpacity=".85" stroke={rose} strokeWidth=".8"/>
      ))}
      <circle cx={CENTER_X} cy={CENTER_Y} r="12"
        fill={centerGlow} stroke={ivory} strokeWidth="2"/>
      <circle cx={CENTER_X} cy={CENTER_Y} r="5" fill="#fffdf3"/>

      {/* Inlay trim around the round/floral OUTER boundary, not tassels. */}
      {Array.from({ length: 40 }, (_, sector) => {
        const angle = -Math.PI / 2 + sector * TAU / 40
        const { x, y } = polar(151, angle)
        return <circle key={sector} cx={x} cy={y} r={sector % 5 === 0 ? 2.7 : 1.65}
          fill={ivory} stroke={gold} strokeWidth=".6"/>
      })}
      {pattern === 'rings' && (
        <circle cx={CENTER_X} cy={CENTER_Y} r="123" fill="none"
          stroke={ivory} strokeWidth="1.4" strokeDasharray="2 6" opacity=".84"/>
      )}
      {pattern === 'rays' && Array.from({ length: 20 }, (_, sector) => (
        <path key={sector} d="M 300 191 L 300 178"
          transform={`rotate(${sector * 18} 300 302)`}
          fill="none" stroke={ivory} strokeWidth="2" opacity=".8"/>
      ))}
    </g>
  )
}
