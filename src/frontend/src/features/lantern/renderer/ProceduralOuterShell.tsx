import { memo, useId } from 'react'
import ExtendedRegionMotif from './ExtendedRegionMotif'
import { ornamentWidthEmphasis } from '../growth/ornamentScaling'
import type { Theme } from '../../customization/themes'
import {
  bandMotifPoint,
  festivalBandPath,
  festivalFacetPath,
  festivalLayers,
  festivalMotifPoint,
  festivalOutlinePath,
  festivalPointAt,
  GROWTH_REGIONS,
  GROWTH_PER_FRIEND,
  isFriendBoundary,
  OUTER_RECIPES,
  outerRadiusForFriends,
  PANEL_SEGMENTS,
  regionPanelPath,
} from '../growth/outerGrowth'

type Props = { theme: Theme; growthCount: number; pattern: string; animateGrowth?: boolean }
const TAU = Math.PI * 2

/**
 * San Fernando-inspired ornamental regions: siku-siku, capiz mosaic,
 * palimbun floral fans, ceremonial rays, and puntetas.
 *
 * Every accepted friend contributes three connected, filled growth layers.
 * Internal glass and floral details exist in all three; only each third layer
 * receives one permanent outer boundary. Fifteen regions extend to layer 150.
 * The small tambor/base is rendered by ParolArtwork and has no tassels.
 */
function ProceduralOuterShell({ theme, growthCount, pattern, animateGrowth = false }: Props) {
  const uid = useId().replace(/:/g, '')
  const recipe = OUTER_RECIPES[theme.key]
  const [primary, ivory, rose, teal] = theme.colors
  const palette = [primary, rose, teal, ivory] as const
  const layers = festivalLayers(growthCount)
  const outline = festivalOutlinePath(growthCount)
  const completedContour = Math.floor(growthCount / GROWTH_PER_FRIEND) * GROWTH_PER_FRIEND
  const boundaryOutline = festivalOutlinePath(completedContour)
  const lastRadius = outerRadiusForFriends(growthCount)
  const glass = `url(#${uid}-capiz)`
  const goldTrim = primary
  const glow = `url(#${uid}-jewel)`
  const regionVisible = GROWTH_REGIONS.filter(region => growthCount >= region.from)
  const motifFill = recipe.motif === 'flower' || recipe.motif === 'jasmine' ? rose :
    recipe.motif === 'star' ? ivory : primary

  return (
    <g data-testid="living-outer-shell" data-friends={Math.floor(growthCount / GROWTH_PER_FRIEND)}
      data-growth-count={growthCount} data-layer-count={layers.length} data-recipe={recipe.key}
      aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-capiz`} x1="6%" y1="8%" x2="94%" y2="90%">
          <stop offset="0%" stopColor={ivory} stopOpacity=".91" />
          <stop offset="36%" stopColor={primary} stopOpacity=".74" />
          <stop offset="70%" stopColor={rose} stopOpacity=".63" />
          <stop offset="100%" stopColor={teal} stopOpacity=".65" />
        </linearGradient>
        <radialGradient id={`${uid}-jewel`}>
          <stop offset="0%" stopColor="#fffef6" />
          <stop offset="38%" stopColor={ivory} />
          <stop offset="100%" stopColor={primary} stopOpacity=".05" />
        </radialGradient>
        <filter id={`${uid}-halo`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* Complete filled glass frame. No empty moat or hanging strings. */}
      <path d={outline} fill="#1b2940" fillOpacity=".94" stroke="none" />

      <g data-testid="festival-friend-layers">
        {layers.map(layer => {
          const n = layer.friendNumber
          const zone = layer.zone
          const familyIndex = GROWTH_REGIONS.findIndex(region => region.zone === zone)
          const hue = palette[(familyIndex + Math.floor(n / 3)) % palette.length]
          const trim = familyIndex % 2 === 0 ? ivory : primary
          return (
            <g key={n} data-growth-layer={n} data-region={zone}
              data-boundary={isFriendBoundary(n) ? "friend" : undefined}
              className={animateGrowth && n === growthCount ? "parol-growth-layer-arrive" : undefined}>
              <path d={festivalBandPath(n)} fill={hue} fillOpacity=".37"
                fillRule="evenodd" stroke="none" />
              {Array.from({ length: PANEL_SEGMENTS }, (_, segment) => {
                const cellColor = palette[(segment % 4 + familyIndex + n) % palette.length]
                return (
                  <path key={segment} data-capiz-facet={segment}
                    d={festivalFacetPath(n, segment)}
                    fill={segment % 3 === 0 ? glass : cellColor}
                    fillOpacity={segment % 3 === 0 ? '.4' : '.25'}
                    stroke={ivory} strokeOpacity=".12" strokeWidth=".5" />
                )
              })}

              {/* Ten small structural inlays per person, fivefold symmetric.
                  Distinct grammar in each decorated zone. */}
              {Array.from({ length: 10 }, (_, sector) => {
                const { x, y } = bandMotifPoint(n, sector)
                const rotation = sector * 36
                return (
                  <g key={sector} transform={`translate(${x} ${y}) rotate(${rotation})`}>
                    {zone === 'siku' && (
                      <g>
                        <path d="M 0 -5 L 4 0 L 0 5 L -4 0 Z"
                          fill={sector % 2 ? primary : rose} fillOpacity=".82"
                          stroke={ivory} strokeWidth=".9" />
                        <path d="M -3 0 L 3 0 M 0 -4 L 0 4"
                          stroke={ivory} strokeWidth=".5" />
                      </g>
                    )}
                    {zone === 'mosaic' && (
                      <g>
                        <path d="M -5 0 Q 0 -7 5 0 Q 0 7 -5 0 Z"
                          fill={sector % 2 ? teal : rose} fillOpacity=".77"
                          stroke={ivory} strokeWidth=".9" />
                        <path d="M -4 0 Q 0 -3 4 0" stroke={ivory} strokeWidth=".65" fill="none" />
                      </g>
                    )}
                    {zone === 'palimbun' && (
                      <g>
                        <ellipse cx="-2.9" cy="-1.5" rx="2.8" ry="5.5"
                          transform="rotate(-35 -2.9 -1.5)" fill={rose} fillOpacity=".85"
                          stroke={ivory} strokeWidth=".65" />
                        <ellipse cx="2.9" cy="-1.5" rx="2.8" ry="5.5"
                          transform="rotate(35 2.9 -1.5)" fill={primary} fillOpacity=".83"
                          stroke={ivory} strokeWidth=".65" />
                        <circle r="1.7" fill={ivory} />
                      </g>
                    )}
                    {zone === 'ceremonial' && (
                      <g>
                        <path d="M -4 4 L 0 -7 L 4 4 Z" fill={rose} fillOpacity=".87"
                          stroke={ivory} strokeWidth=".85" />
                        <path d="M 0 -5 L 0 2 M -4 3 L 4 3" stroke={primary} strokeWidth=".8"/>
                      </g>
                    )}
                    {zone === 'puntetas' && (
                      <g>
                        <path d="M 0 -6 L 2 -2 L 6 0 L 2 2 L 0 6 L -2 2 L -6 0 L -2 -2 Z"
                          fill={ivory} fillOpacity=".78" stroke={primary} strokeWidth=".9"/>
                        <circle r="1.6" fill={rose}/>
                      </g>
                    )}
                    {n > 50 && <g transform="scale(.21)">
                      <ExtendedRegionMotif zone={zone} primary={primary} ivory={ivory}
                        rose={rose} teal={teal} color={hue}/>
                    </g>}
                  </g>
                )
              })}
              {/* Only one completed outline per three growth layers. */}
              {isFriendBoundary(n) && <path d={festivalOutlinePath(n)} fill="none"
                stroke={n % 15 === 0 ? ivory : trim}
                strokeWidth={n % 15 === 0 ? 2.3 : 1.05}
                strokeOpacity={n % 15 === 0 ? '.82' : '.45'}
                strokeLinejoin="round"/>}
            </g>
          )
        })}
      </g>

      {/* Large panels belong to regions, not individual rings. They connect
          bands into coherent geometric flowers, diamonds and fan windows.
          Incomplete regions stop exactly at the current friend count. */}
      <g data-testid="festival-regional-patterns">
        {regionVisible.map((region, regionIndex) => {
          const end = Math.min(growthCount, region.to)
          // A new design is 6% larger in both dimensions, with matching
          // deeper radial space provided by its structural region.
          const ornamentEmphasis = ornamentWidthEmphasis(regionIndex)
          return (
            <g key={region.zone} data-growth-region={region.zone}
              data-visible-through-layer={end}>
              {Array.from({ length: 10 }, (_, sector) => {
                const color = palette[(sector % 2 + regionIndex) % palette.length]
                const inner = festivalMotifPoint(region.from - 1, sector, 10)
                const outer = festivalMotifPoint(end, sector, 10)
                const midIndex = Math.floor((region.from + end) / 2)
                const center = bandMotifPoint(midIndex, sector)
                const fillSize = Math.min(3.1, Math.max(.55, (end - region.from + 1) * 10.5 / 39))
                const control = bandMotifPoint(midIndex, sector)
                return (
                  <g key={sector}>
                    <path d={regionPanelPath(region.from, end, sector)}
                      fill={region.zone === 'palimbun' ? motifFill : color}
                      fillOpacity={region.zone === 'palimbun' ? '.42' : '.33'}
                      stroke={ivory} strokeOpacity=".73" strokeWidth="2.0"/>
                    {/* A coherent large-scale design appears INSIDE each
                        region as its bands arrive, rather than just a thin border. */}
                    <g transform={`translate(${center.x} ${center.y}) rotate(${sector * 36 + 18}) scale(${fillSize * ornamentEmphasis})`}>
                      {region.zone === 'siku' && (
                        <g>
                          <path d="M 0 -25 L 15 0 L 0 25 L -15 0 Z"
                            fill={color} fillOpacity=".68" stroke={ivory} strokeWidth="1.9"/>
                          <path d="M 0 -22 L 0 22 M -13 0 L 13 0"
                            stroke={primary} strokeWidth="1.6"/>
                          <path d="M -12 0 L 0 -12 L 12 0 L 0 12 Z"
                            fill="none" stroke={ivory} strokeWidth="1.2"/>
                        </g>
                      )}
                      {region.zone === 'mosaic' && (
                        <g>
                          <path d="M -12 18 Q -21 -3 0 -26 Q 21 -3 12 18 Z"
                            fill={color} fillOpacity=".73" stroke={ivory} strokeWidth="1.9"/>
                          <path d="M 0 -25 L 0 18 M -9 11 Q 0 -2 9 11"
                            fill="none" stroke={primary} strokeWidth="1.5"/>
                          <circle cy="-5" r="3.5" fill={ivory}/>
                        </g>
                      )}
                      {region.zone === 'palimbun' && (
                        <g>
                          {Array.from({ length: 5 }, (_, petal) => (
                            <ellipse key={petal} cx="0" cy="-14" rx="11" ry="23"
                              transform={`rotate(${petal * 72})`}
                              fill={petal % 2 ? rose : color} fillOpacity=".67"
                              stroke={ivory} strokeWidth="1.8"/>
                          ))}
                          <circle r="10" fill={primary} stroke={ivory} strokeWidth="2"/>
                          <circle r="4" fill="#fff9e0"/>
                        </g>
                      )}
                      {region.zone === 'ceremonial' && (
                        <g>
                          {Array.from({ length: 8 }, (_, fan) => (
                            <path key={fan} d="M -5 -7 L -8 -26 L 0 -33 L 8 -26 L 5 -7 Z"
                              transform={`rotate(${fan * 45})`}
                              fill={fan % 2 ? rose : color} fillOpacity=".76"
                              stroke={ivory} strokeWidth="1.5"/>
                          ))}
                          <circle r="9" fill="#253546" stroke={ivory} strokeWidth="1.7"/>
                          <circle r="4.5" fill={primary}/>
                        </g>
                      )}
                      {region.zone === 'puntetas' && (
                        <g>
                          <path d="M 0 -25 L 6 -8 L 24 0 L 6 8 L 0 25 L -6 8 L -24 0 L -6 -8 Z"
                            fill={color} fillOpacity=".78" stroke={ivory} strokeWidth="1.8"/>
                          <path d="M 0 -21 L 0 21 M -20 0 L 20 0"
                            stroke={primary} strokeWidth="1.7"/>
                          <circle r="6" fill={ivory} stroke={rose} strokeWidth="1.3"/>
                        </g>
                      )}
                      {region.from > 50 && <ExtendedRegionMotif zone={region.zone}
                        primary={primary} ivory={ivory} rose={rose} teal={teal} color={color}/>}
                    </g>
                    {end - region.from >= 2 && (
                      <path d={`M ${inner.x.toFixed(2)} ${inner.y.toFixed(2)}
                        Q ${control.x.toFixed(2)} ${control.y.toFixed(2)}
                          ${outer.x.toFixed(2)} ${outer.y.toFixed(2)}`}
                        fill="none" stroke={region.zone === 'siku' ? primary : ivory}
                        strokeOpacity=".38" strokeWidth=".95"/>
                    )}
                  </g>
                )
              })}
              {/* Region patterns meet without drawing a second outer boundary. */}
            </g>
          )
        })}
      </g>

      {/* Repeat the delicate structural boundaries above the larger panels.
          They remain visible even where patterns span across several bands. */}
      <g data-testid="festival-layer-details">
        {layers.filter(layer => isFriendBoundary(layer.friendNumber)).map(({ friendNumber: n }) => (
          <path key={n} d={festivalOutlinePath(n)} fill="none"
            stroke={n % 15 === 0 ? ivory : goldTrim}
            strokeWidth={n % 15 === 0 ? 1.6 : .75}
            strokeOpacity={n % 15 === 0 ? '.82' : '.35'}/>
        ))}
      </g>

      {/* Fivefold capiz medallions appear every fifth new layer and help make
          the finished design feel like a coherent festival lantern. */}
      <g data-testid="festival-medallions">
        {layers.filter(layer => layer.friendNumber % 5 === 0).flatMap(layer =>
          Array.from({ length: 5 }, (_, sector) => {
            const pos = bandMotifPoint(layer.friendNumber, sector, 5)
            const n = layer.friendNumber
            return (
              <g key={`${n}-${sector}`} transform={`translate(${pos.x} ${pos.y})`}>
                <circle r="9.5" fill="#263b48" fillOpacity=".82"
                  stroke={ivory} strokeWidth="1.8"/>
                {(recipe.motif === 'flower' || recipe.motif === 'jasmine') && (
                  <g>
                    {Array.from({ length: 5 }, (_, petal) => (
                      <ellipse key={petal} cx="0" cy="-5.5"
                        rx={recipe.motif === 'jasmine' ? 4.3 : 3.2} ry="6"
                        transform={`rotate(${petal * 72})`}
                        fill={recipe.motif === 'jasmine' ? ivory : petal % 2 ? rose : teal}
                        fillOpacity=".87" stroke={primary} strokeWidth=".75"/>
                    ))}
                  </g>
                )}
                {recipe.motif === 'diamond' && (
                  <g>
                    <path d="M 0 -8 L 6 0 L 0 8 L -6 0 Z"
                      fill={rose} stroke={ivory} strokeWidth="1.2"/>
                    <path d="M -6 0 L 6 0 M 0 -8 L 0 8"
                      fill="none" stroke={primary} strokeWidth=".85"/>
                  </g>
                )}
                {recipe.motif === 'fan' && Array.from({ length: 8 }, (_, ray) => (
                  <path key={ray} d="M -2 -2 L -4 -7 L 0 -9 L 4 -7 L 2 -2 Z"
                    transform={`rotate(${ray * 45})`}
                    fill={ray % 2 ? teal : rose} stroke={ivory} strokeWidth=".7"/>
                ))}
                {recipe.motif === 'star' && (
                  <path d="M 0 -9 L 2.5 -3 L 9 0 L 2.5 3 L 0 9 L -2.5 3 L -9 0 L -2.5 -3 Z"
                    fill={ivory} stroke={primary} strokeWidth=".95"/>
                )}
                {recipe.motif === 'sun' && Array.from({ length: 10 }, (_, ray) => (
                  <path key={ray} d="M -2 -3 L 0 -9 L 2 -3 Z"
                    transform={`rotate(${ray * 36})`}
                    fill={rose} stroke={ivory} strokeWidth=".8"/>
                ))}
                <circle r="2.9" fill={ivory} stroke={primary} strokeWidth="1"/>
              </g>
            )
          })
        )}
      </g>

      {/* No ribbons, hanging tail or dangling fringe: a polished lit border. */}
      <path d={boundaryOutline} fill="none" stroke={primary} strokeWidth="11" opacity=".22"
        filter={`url(#${uid}-halo)`}/>
      <path d={boundaryOutline} fill="none" stroke={ivory} strokeWidth="3.4"
        strokeLinejoin="round" />
      {Array.from({ length: 40 }, (_, index) => {
        const pos = festivalMotifPoint(completedContour, index, 40)
        return (
          <g key={index}>
            <circle cx={pos.x} cy={pos.y} r="5.1"
              fill={primary} opacity=".22"/>
            <circle cx={pos.x} cy={pos.y} r={index % 8 === 0 ? 3.4 : 2}
              fill={ivory} stroke={primary} strokeWidth=".65"/>
            {index % 8 === 0 && (
              <circle cx={pos.x} cy={pos.y} r="7.4"
                fill={glow} opacity=".2"/>
            )}
          </g>
        )
      })}
      {pattern === 'rays' && Array.from({ length: 10 }, (_, index) => {
        const angle = -Math.PI / 2 + index * TAU / 10
        const p0 = festivalPointAt(Math.max(0, completedContour - 2), angle)
        const p1 = festivalPointAt(completedContour, angle)
        return <path key={index}
          d={`M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`}
          stroke={ivory} strokeWidth="1.9" opacity=".7"/>
      })}
      {pattern === 'rings' && (
        <path d={boundaryOutline} fill="none"
          stroke={primary} strokeWidth="1.5" strokeDasharray="3 5"/>
      )}
      {animateGrowth && <g className="parol-growth-flare" pointerEvents="none">
        <path d={outline} fill="none" stroke={ivory} strokeWidth="5"
          className="parol-growth-flash" opacity=".9"/>
        {Array.from({ length: 20 }, (_, index) => {
          const pos = festivalMotifPoint(growthCount, index, 20)
          return <g key={index} transform={`translate(${pos.x} ${pos.y})`}>
            <g className="parol-growth-sparkle" style={{ animationDelay: `${index * 33}ms` }}>
              <path d="M 0 -8 L 2 -2 L 8 0 L 2 2 L 0 8 L -2 2 L -8 0 L -2 -2 Z"
                fill={index % 2 ? rose : ivory} stroke={primary} strokeWidth=".7"/>
            </g>
          </g>
        })}
      </g>}
      <title>{`${recipe.name}: ${growthCount} growth layers, ${Math.floor(growthCount / 3)} completed friend outlines across 15 festival regions. Outer radius ${lastRadius.toFixed(1)}.`}</title>
    </g>
  )
}

export default memo(ProceduralOuterShell)
