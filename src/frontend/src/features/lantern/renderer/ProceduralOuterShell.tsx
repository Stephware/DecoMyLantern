import { useId } from 'react'
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
  OUTER_RECIPES,
  outerRadiusForFriends,
  PANEL_SEGMENTS,
  regionPanelPath,
} from '../growth/outerGrowth'

type Props = { theme: Theme; friendCount: number; pattern: string }
const TAU = Math.PI * 2

/**
 * San Fernando-inspired ornamental regions: siku-siku, capiz mosaic,
 * palimbun floral fans, ceremonial rays, and puntetas.
 *
 * Every accepted friend creates a full, filled, contiguous outer band with
 * 20 stained-glass facets. Each band belongs to a different motif grammar
 * according to its structural region, not a repeated circular outline.
 * 50 accepted friends ALWAYS results in precisely 50 data-friend-layer groups.
 * The small tambor/base is rendered by ParolArtwork and has no tassels.
 */
export default function ProceduralOuterShell({ theme, friendCount, pattern }: Props) {
  const uid = useId().replace(/:/g, '')
  const recipe = OUTER_RECIPES[theme.key]
  const [primary, ivory, rose, teal] = theme.colors
  const palette = [primary, rose, teal, ivory] as const
  const layers = festivalLayers(friendCount)
  const outline = festivalOutlinePath(friendCount)
  const lastRadius = outerRadiusForFriends(friendCount)
  const glass = `url(#${uid}-capiz)`
  const glow = `url(#${uid}-jewel)`
  const regionVisible = GROWTH_REGIONS.filter(region => friendCount >= region.from)
  const motifFill = recipe.motif === 'flower' || recipe.motif === 'jasmine' ? rose :
    recipe.motif === 'star' ? ivory : primary

  return (
    <g data-testid="living-outer-shell" data-friends={friendCount}
      data-layer-count={layers.length} data-recipe={recipe.key}
      className="parol-ornament-reveal" aria-hidden="true">
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
          const familyIndex = zone === 'siku' ? 0 : zone === 'mosaic' ? 1 :
            zone === 'palimbun' ? 2 : zone === 'ceremonial' ? 3 : 4
          const hue = palette[(familyIndex + Math.floor(n / 3)) % palette.length]
          const trim = familyIndex % 2 === 0 ? ivory : primary
          return (
            <g key={n} data-friend-layer={n} data-region={zone}>
              <path d={festivalBandPath(n)} fill={hue} fillOpacity=".67"
                fillRule="evenodd" stroke="none" />
              {Array.from({ length: PANEL_SEGMENTS }, (_, segment) => {
                const cellColor = palette[(Math.floor(segment / 2) + familyIndex + n) % palette.length]
                return (
                  <path key={segment} data-capiz-facet={segment}
                    d={festivalFacetPath(n, segment)}
                    fill={segment % 3 === 0 ? glass : cellColor}
                    fillOpacity={segment % 3 === 0 ? '.62' : '.4'}
                    stroke={ivory} strokeOpacity=".16" strokeWidth=".6" />
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
                  </g>
                )
              })}
              {/* Every completed friend's boundary remains a true contour. */}
              <path d={festivalOutlinePath(n)} fill="none"
                stroke={n % 5 === 0 ? ivory : trim}
                strokeWidth={n % 5 === 0 ? 2.7 : 1.3}
                strokeOpacity={n % 5 === 0 ? '.96' : '.67'}
                strokeLinejoin="round"/>
            </g>
          )
        })}
      </g>

      {/* Large panels belong to regions, not individual rings. They connect
          bands into coherent geometric flowers, diamonds and fan windows.
          Incomplete regions stop exactly at the current friend count. */}
      <g data-testid="festival-regional-patterns">
        {regionVisible.map((region, regionIndex) => {
          const end = Math.min(friendCount, region.to)
          return (
            <g key={region.zone} data-growth-region={region.zone}
              data-visible-through-layer={end}>
              {Array.from({ length: 10 }, (_, sector) => {
                const color = palette[(sector % 5 + regionIndex) % palette.length]
                const inner = festivalMotifPoint(region.from - 1, sector, 10)
                const outer = festivalMotifPoint(end, sector, 10)
                const midIndex = Math.floor((region.from + end) / 2)
                const center = bandMotifPoint(midIndex, sector)
                const fillSize = Math.min(1.15, .35 + (end - region.from + 1) / 12)
                const control = bandMotifPoint(midIndex, sector)
                return (
                  <g key={sector}>
                    <path d={regionPanelPath(region.from, end, sector)}
                      fill={region.zone === 'palimbun' ? motifFill : color}
                      fillOpacity={region.zone === 'palimbun' ? '.24' : '.13'}
                      stroke={ivory} strokeOpacity=".39" strokeWidth="1.5"/>
                    {/* A coherent large-scale design appears INSIDE each
                        region as its bands arrive, rather than just a thin border. */}
                    <g transform={`translate(${center.x} ${center.y}) rotate(${sector * 36 + 18}) scale(${fillSize})`}>
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
              {/* A bold ornamental seam makes different growth regions visible
                  without requiring all 50 layers to use the same motif. */}
              <path d={festivalOutlinePath(end)} fill="none"
                stroke={ivory} strokeWidth="2.2" strokeOpacity=".82"/>
            </g>
          )
        })}
      </g>

      {/* Repeat the delicate structural boundaries above the larger panels.
          They remain visible even where patterns span across several bands. */}
      <g data-testid="festival-layer-details">
        {layers.map(({ friendNumber: n }) => (
          <path key={n} d={festivalOutlinePath(n)} fill="none"
            stroke={n % 5 === 0 ? ivory : primary}
            strokeWidth={n % 5 === 0 ? 1.7 : .9}
            strokeOpacity={n % 5 === 0 ? '.88' : '.48'}/>
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
                {Array.from({ length: 5 }, (_, petal) => (
                  <ellipse key={petal} cx="0" cy="-5.5" rx="3.2" ry="6"
                    transform={`rotate(${petal * 72})`}
                    fill={petal % 2 ? rose : teal} fillOpacity=".85"
                    stroke={ivory} strokeWidth=".65"/>
                ))}
                <circle r="2.9" fill={ivory} stroke={primary} strokeWidth="1"/>
              </g>
            )
          })
        )}
      </g>

      {/* No ribbons, hanging tail or dangling fringe: a polished lit border. */}
      <path d={outline} fill="none" stroke={primary} strokeWidth="11" opacity=".22"
        filter={`url(#${uid}-halo)`}/>
      <path d={outline} fill="none" stroke={ivory} strokeWidth="3.4"
        strokeLinejoin="round" />
      {Array.from({ length: 40 }, (_, index) => {
        const pos = festivalMotifPoint(friendCount, index, 40)
        return (
          <g key={index}>
            <circle cx={pos.x} cy={pos.y} r="5.1"
              fill={primary} opacity=".22"/>
            <circle cx={pos.x} cy={pos.y} r={index % 5 === 0 ? 3.4 : 2}
              fill={ivory} stroke={primary} strokeWidth=".65"/>
            {index % 5 === 0 && (
              <circle cx={pos.x} cy={pos.y} r="7.4"
                fill={glow} opacity=".2"/>
            )}
          </g>
        )
      })}
      {pattern === 'rays' && Array.from({ length: 10 }, (_, index) => {
        const angle = -Math.PI / 2 + index * TAU / 10
        const p0 = festivalPointAt(Math.max(0, friendCount - 2), angle)
        const p1 = festivalPointAt(friendCount, angle)
        return <path key={index}
          d={`M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`}
          stroke={ivory} strokeWidth="1.9" opacity=".7"/>
      })}
      {pattern === 'rings' && (
        <path d={festivalOutlinePath(friendCount)} fill="none"
          stroke={primary} strokeWidth="1.5" strokeDasharray="3 5"/>
      )}
      <title>{`${recipe.name}: ${friendCount} connected decorated layers in five festival regions; no hanging tail. Outer radius ${lastRadius.toFixed(1)}.`}</title>
    </g>
  )
}
