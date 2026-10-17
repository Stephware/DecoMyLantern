import { useId } from 'react'
import type { Theme } from '../../customization/themes'
import {
  motifCountForFriends,
  OUTER_RECIPES,
  outerMotifPosition,
  outerPetalPath,
  outerShellPath,
  shellCountForFriends,
} from '../growth/outerGrowth'

type Props = { theme: Theme; friendCount: number; pattern: string }

/**
 * The living parol's outer silhouette is recomposed after every contribution.
 * It is an intentional fivefold artwork, not one literal circle per friend.
 * Rendering is presentation-only; accepted friend identities stay in the star.
 */
export default function ProceduralOuterShell({ theme, friendCount, pattern }: Props) {
  const uid = useId().replace(/:/g, '')
  const recipe = OUTER_RECIPES[theme.key]
  const [gold, cream, accent, leaf] = theme.colors
  const layers = shellCountForFriends(friendCount, theme.key)
  const motifs = motifCountForFriends(friendCount)
  const petalFill = recipe.wave === 'petal' ? accent : recipe.wave === 'lace' ? cream : gold
  return (
    <g data-testid="living-outer-shell" data-friends={friendCount}
      data-recipe={recipe.key} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-outer-fill`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={cream} stopOpacity=".23" />
          <stop offset="45%" stopColor={accent} stopOpacity=".15" />
          <stop offset="100%" stopColor={leaf} stopOpacity=".08" />
        </linearGradient>
        <filter id={`${uid}-outer-glow`} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {Array.from({ length: layers }, (_, index) => (
        <g key={index} data-shell-layer={index}>
          <path d={outerShellPath(friendCount, recipe.key, index)}
            fill={index === 0 ? `url(#${uid}-outer-fill)` : 'none'}
            stroke={index % 2 ? accent : cream}
            strokeWidth={index === 0 ? 4 : 2.2}
            strokeOpacity={0.85 - index * 0.13}
            strokeLinejoin={recipe.wave === 'facet' ? 'miter' : 'round'}/>
          <path d={outerShellPath(friendCount, recipe.key, index)}
            fill="none" stroke={gold} strokeWidth="8" strokeOpacity=".08"
            filter={`url(#${uid}-outer-glow)`} />
        </g>
      ))}

      {/* Balanced repeated motifs make each new contour look handcrafted. */}
      {Array.from({ length: motifs }, (_, index) => {
        const { x, y } = outerMotifPosition(friendCount, index)
        const color = index % 3 === 0 ? accent : index % 3 === 1 ? leaf : gold
        return (
          <g key={index} data-motif={recipe.motif}>
            <path d={outerPetalPath(friendCount, recipe.key, index)}
              fill={recipe.wave === 'lace' ? 'none' : index % 2 ? color : petalFill}
              fillOpacity={recipe.wave === 'petal' ? '.38' : '.27'}
              stroke={index % 2 ? gold : cream}
              strokeOpacity=".74" strokeWidth="1.35" strokeLinejoin="round"/>
            <circle cx={x} cy={y} r={index % 5 === 0 ? 3.4 : 2.1}
              fill={cream} opacity=".91"/>
          </g>
        )
      })}

      {/* Family-specific secondary motif. All motifs repeat symmetrically. */}
      {Array.from({ length: 5 }, (_, i) => (
        <g key={i} transform={`rotate(${i * 72} 300 302)`}>
          {recipe.motif === 'diamond' && (
            <path d="M300 106 L289 121 L300 144 L311 121 Z"
              fill={gold} fillOpacity=".27" stroke={cream} strokeWidth="2.2"/>
          )}
          {recipe.motif === 'flower' && (
            <g fill={accent} fillOpacity=".37" stroke={cream} strokeWidth="1.5">
              <ellipse cx="291" cy="127" rx="10" ry="22" transform="rotate(-24 291 127)"/>
              <ellipse cx="309" cy="127" rx="10" ry="22" transform="rotate(24 309 127)"/>
            </g>
          )}
          {recipe.motif === 'fan' && (
            <g stroke={cream} strokeWidth="1.6" fill="none">
              <path d="M284 139 Q300 93 316 139 M289 139 L300 102 L311 139"/>
              <circle cx="300" cy="105" r="3" fill={gold}/>
            </g>
          )}
          {recipe.motif === 'star' && (
            <path d="M300 100 L305 116 L321 121 L305 126 L300 144 L295 126 L279 121 L295 116 Z"
              fill={cream} fillOpacity=".36" stroke={gold} strokeWidth="2"/>
          )}
          {recipe.motif === 'sun' && (
            <g stroke={gold} strokeWidth="2.4" strokeLinecap="round">
              <path d="M300 101 L300 139 M288 106 L293 138 M312 106 L307 138"/>
              <circle cx="300" cy="101" r="4" fill={accent}/>
            </g>
          )}
          {recipe.motif === 'jasmine' && (
            <g fill={cream} fillOpacity=".55" stroke={leaf} strokeWidth="1.3">
              <ellipse cx="300" cy="113" rx="8" ry="19"/>
              <ellipse cx="290" cy="122" rx="8" ry="19" transform="rotate(-44 290 122)"/>
              <ellipse cx="310" cy="122" rx="8" ry="19" transform="rotate(44 310 122)"/>
            </g>
          )}
        </g>
      ))}

      {pattern === 'rays' && Array.from({ length: 10 }, (_, index) => (
        <path key={index} d="M300 111 L300 94"
          transform={`rotate(${index * 36} 300 302)`}
          stroke={cream} strokeWidth="2" strokeOpacity=".72" strokeLinecap="round"/>
      ))}
    </g>
  )
}
