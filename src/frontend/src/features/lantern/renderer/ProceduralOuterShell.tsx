import { useId } from 'react'
import type { Theme } from '../../customization/themes'
import {
  growthPhase,
  friendInlayPosition,
  insetStarPoints,
  motifCountForFriends,
  ornamentPlanForFriends,
  OUTER_RECIPES,
  outerFitZoom,
  outerMotifPosition,
  outerPetalPath,
  outerRadiusForFriends,
  outerShellPath,
  polarPoint,
  shellCountForFriends,
} from '../growth/outerGrowth'

type Props = { theme: Theme; friendCount: number; pattern: string }
const TAU = Math.PI * 2
const CENTER_Y = 302

/**
 * A layered, capiz-inspired parol: structural star beams (siku-siku), jewel-
 * glass infill, flower medallions, latticework, palimbun scallops and puntetas.
 *
 * Growth changes ALL panel proportions and trim density together. Individual
 * contributor identity remains with the core lights; no entire ring belongs
 * to a person. Fivefold balance never depends on the count being divisible by 5.
 */
export default function ProceduralOuterShell({ theme, friendCount, pattern }: Props) {
  const uid = useId().replace(/:/g, '')
  const recipe = OUTER_RECIPES[theme.key]
  const [gold, cream, rose, leaf] = theme.colors
  const radius = outerRadiusForFriends(friendCount)
  const plan = ornamentPlanForFriends(friendCount)
  const phase = growthPhase(friendCount)
  const contours = shellCountForFriends(friendCount, theme.key)
  const puntetas = motifCountForFriends(friendCount)
  const petals = recipe.wave === 'petal' || recipe.motif === 'jasmine'
  const glass = `url(#${uid}-capiz)`
  const warm = `url(#${uid}-warm)`
  const glow = `url(#${uid}-gold-glow)`
  const petalOpacity = Math.min(.88, .63 + friendCount * .004)
  const tipY = CENTER_Y - radius + 18
  const blossomY = CENTER_Y - (radius - 48)
  const glassTone = recipe.motif === 'jasmine' || recipe.motif === 'star' ? cream : rose

  // r~215–255 keeps rich panel details readable on phones. We grow the
  // composition by elaborating panels, not by expanding 50 empty circles.
  return (
    <g data-testid="living-outer-shell" data-friends={friendCount}
      data-recipe={recipe.key} data-zoom={outerFitZoom(friendCount)} className="parol-ornament-reveal"
      aria-hidden="true">
      <defs>
        <radialGradient id={`${uid}-capiz`} cx="43%" cy="34%" r="80%">
          <stop offset="0%" stopColor={cream} stopOpacity=".94" />
          <stop offset="45%" stopColor={gold} stopOpacity=".68" />
          <stop offset="78%" stopColor={rose} stopOpacity=".52" />
          <stop offset="100%" stopColor={leaf} stopOpacity=".36" />
        </radialGradient>
        <linearGradient id={`${uid}-warm`} x1="0%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor={cream} stopOpacity=".86" />
          <stop offset="48%" stopColor={rose} stopOpacity=".66" />
          <stop offset="100%" stopColor={leaf} stopOpacity=".72" />
        </linearGradient>
        <radialGradient id={`${uid}-gold-glow`}>
          <stop offset="0%" stopColor="#fffefa" />
          <stop offset="30%" stopColor={cream} />
          <stop offset="100%" stopColor={gold} stopOpacity=".12" />
        </radialGradient>
        <radialGradient id={`${uid}-body`}>
          <stop offset="0%" stopColor="#382537" stopOpacity=".96"/>
          <stop offset="68%" stopColor="#4f3c3f" stopOpacity=".9"/>
          <stop offset="100%" stopColor={leaf} stopOpacity=".6"/>
        </radialGradient>
        <filter id={`${uid}-soft-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.7" />
        </filter>
      </defs>

      {/* Metal rim and translucent paper/capiz backing, rather than empty halos. */}
      <path d={outerShellPath(friendCount, recipe.key)}
        fill={`url(#${uid}-body)`} stroke={cream} strokeWidth="4.5"
        strokeLinejoin="round" opacity=".92" />
      <path d={outerShellPath(friendCount, recipe.key)}
        fill="none" stroke={gold} strokeWidth="10" strokeOpacity=".22"
        filter={`url(#${uid}-soft-glow)`} />
      {Array.from({ length: contours - 1 }, (_, i) => (
        <path key={i} d={outerShellPath(friendCount, recipe.key, i + 1)}
          fill="none" stroke={i % 2 ? gold : rose} strokeWidth={i ? 1.5 : 2.2}
          strokeOpacity={.77 - i * .12} strokeLinejoin="round" />
      ))}

      {/* Large translucent capiz-pointed beams, one for each major star tip.
          Split-glass ribs and two tiny enamel teardrops form a recognisable
          handmade frame even at zero accepted friends. */}
      {Array.from({ length: 5 }, (_, sector) => (
        <g key={sector} transform={`rotate(${sector * 72} 300 302)`}>
          <path
            d={`M 268 170 Q 275 115 300 ${tipY.toFixed(2)}
              Q 325 115 332 170 L 300 149 Z`}
            fill={glass} fillOpacity={petalOpacity} stroke={cream}
            strokeWidth="3.2" strokeLinejoin="round" />
          <path
            d={`M 277 162 Q 281 124 300 ${(tipY + 14).toFixed(2)}
              Q 319 124 323 162`}
            fill="none" stroke={gold} strokeWidth="2.3"/>
          <path d={`M 300 ${(tipY + 10).toFixed(2)} L 300 150
            M 285 145 L 300 ${(tipY + 28).toFixed(2)} L 315 145`}
            fill="none" stroke="#fff4d4" strokeOpacity=".88" strokeWidth="1.5" />
          <path d="M 278 157 L 300 169 L 322 157" fill="none" stroke={rose}
            strokeWidth="2" strokeOpacity=".88" />
          <path d={`M 300 ${(tipY + 18).toFixed(2)}
            L 291 ${(tipY + 44).toFixed(2)} L 300 ${(tipY + 60).toFixed(2)}
            L 309 ${(tipY + 44).toFixed(2)} Z`}
            fill={warm} stroke={cream} strokeWidth="1.35" />
          <circle cx="300" cy={tipY + 12} r="3.4" fill={cream} />
          {Array.from({ length: plan.panelSeams }, (_, rib) => (
            <g key={rib} stroke="#fff4d4" strokeOpacity=".66" strokeWidth="1.05">
              <path d={`M ${285 - rib * 1.4} ${149 - rib * 8}
                L 300 ${(tipY + 25 + rib * 5).toFixed(2)}
                L ${315 + rib * 1.4} ${149 - rib * 8}`}
                fill="none" />
            </g>
          ))}
        </g>
      ))}

      {/* Between the five long star points sit stained-glass flower windows.
          They are intentionally large enough to read as craftsmanship, not
          merely pin-sized ornaments decorating an otherwise plain circle. */}
      {Array.from({ length: 5 }, (_, sector) => (
        <g key={sector} transform={`rotate(${sector * 72 + 36} 300 302)`}>
          <path d={`M 263 163
            C 250 142 267 ${(blossomY - 19).toFixed(1)} 300 ${(blossomY - 22).toFixed(1)}
            C 333 ${(blossomY - 19).toFixed(1)} 350 142 337 163
            Q 324 181 300 169 Q 276 181 263 163 Z`}
            fill={warm} fillOpacity=".76" stroke={cream}
            strokeWidth="2.5" strokeLinejoin="round"/>
          <g transform={`translate(300 ${blossomY.toFixed(2)})`}>
            {(recipe.motif === 'flower' || recipe.motif === 'jasmine') && (
              <g>
                {Array.from({ length: 5 }, (_, petal) => (
                  <g key={petal} transform={`rotate(${petal * 72})`}>
                    <ellipse cx="0" cy="-17" rx={petals ? 12 : 10.2}
                      ry={petals ? 20 : 18} fill={petal % 2 ? gold : glassTone}
                      fillOpacity=".67" stroke={cream} strokeWidth="1.55"/>
                    <path d="M 0 -7 L 0 -31" fill="none"
                      stroke="#fff9dd" strokeOpacity=".7" strokeWidth=".9"/>
                    {friendCount >= 10 && (
                      <path d="M -4 -18 Q 0 -27 4 -18" fill="none"
                        stroke={rose} strokeOpacity=".75" strokeWidth=".9"/>
                    )}
                  </g>
                ))}
                {recipe.motif === 'flower' && (
                  <g>
                    <path d="M -21 14 Q -30 0 -19 -16 M 21 14 Q 30 0 19 -16"
                      fill="none" stroke={leaf} strokeWidth="2.1"/>
                    <circle cx="-20" cy="-14" r="2.6" fill={cream}/>
                    <circle cx="20" cy="-14" r="2.6" fill={cream}/>
                  </g>
                )}
              </g>
            )}
            {recipe.motif === 'diamond' && (
              <g>
                {Array.from({ length: 4 }, (_, i) => (
                  <g key={i} transform={`rotate(${i * 90})`}>
                    <path d="M 0 -33 L 13 -16 L 0 2 L -13 -16 Z"
                      fill={i % 2 ? rose : gold} fillOpacity=".66"
                      stroke={cream} strokeWidth="1.7"/>
                    <path d="M 0 -30 L 0 -3" fill="none"
                      stroke="#fff4d6" strokeWidth="1.1"/>
                  </g>
                ))}
                <polygon points={insetStarPoints(0, 0, 17, 9)}
                  fill={glassTone} fillOpacity=".52"
                  stroke={cream} strokeWidth="1.3"/>
              </g>
            )}
            {recipe.motif === 'fan' && (
              <g>
                {Array.from({ length: 9 }, (_, i) => (
                  <g key={i} transform={`rotate(${i * 40})`}>
                    <path d="M -5 -8 L -8 -28 Q 0 -36 8 -28 L 5 -8 Z"
                      fill={i % 3 === 0 ? rose : i % 3 === 1 ? gold : leaf}
                      fillOpacity=".67" stroke={cream} strokeWidth="1.2"/>
                    <path d="M 0 -11 L 0 -29" fill="none"
                      stroke="#fff9da" strokeWidth=".9"/>
                  </g>
                ))}
              </g>
            )}
            {recipe.motif === 'star' && (
              <g>
                <polygon points={insetStarPoints(0, 0, 33, 13)}
                  fill={leaf} fillOpacity=".57" stroke={cream} strokeWidth="2"/>
                <polygon points={insetStarPoints(0, 0, 25, 10)}
                  fill="none" stroke={gold} strokeWidth="1.6"/>
                {Array.from({ length: 10 }, (_, i) => (
                  <g key={i} transform={`rotate(${i * 36})`}>
                    <path d="M 0 -18 L 0 -29" stroke={cream} strokeWidth="1.2"/>
                    <circle cx="0" cy="-29" r="2" fill="#fff7de"/>
                  </g>
                ))}
              </g>
            )}
            {recipe.motif === 'sun' && (
              <g>
                {Array.from({ length: 12 }, (_, i) => (
                  <g key={i} transform={`rotate(${i * 30})`}>
                    <path d="M -4 -10 L -6 -33 L 0 -39 L 6 -33 L 4 -10 Z"
                      fill={i % 2 ? gold : rose} fillOpacity=".75"
                      stroke={cream} strokeWidth="1.15"/>
                    <path d="M 0 -11 L 0 -34" stroke="#fff7d3" strokeWidth=".85"/>
                  </g>
                ))}
              </g>
            )}
            <circle r="10" fill={gold} stroke={cream} strokeWidth="2"/>
            <circle r="4" fill="#fffee8"/>
            {recipe.motif === 'star' && (
              <polygon points={insetStarPoints(0, 0, 15, 7.5)}
                fill="none" stroke="#fff9e6" strokeWidth="1.5"/>
            )}
            {recipe.motif === 'diamond' && (
              <path d="M 0 -15 L 13 0 L 0 15 L -13 0 Z"
                fill="none" stroke={cream} strokeWidth="1.6"/>
            )}
            {recipe.motif === 'sun' && (
              <g stroke={cream} strokeWidth="1.8">
                {Array.from({ length: 8 }, (_, i) =>
                  <path key={i} d="M 0 -12 L 0 -19" transform={`rotate(${i * 45})`}/>)}
              </g>
            )}
          </g>
        </g>
      ))}

      {/* Kapampangan-inspired siku-siku: woven criss-crossing pieces.
          Five sets of paired glass kites create a second recognisable
          star inside the palimbun, with elegant gold lines through each. */}
      {Array.from({ length: 5 }, (_, sector) => (
        <g key={sector} transform={`rotate(${sector * 72} 300 302)`}>
          <path d="M 250 179 L 274 155 L 295 190 L 270 208 Z"
            fill={glass} fillOpacity=".55" stroke={gold} strokeWidth="1.9"/>
          <path d="M 350 179 L 326 155 L 305 190 L 330 208 Z"
            fill={glass} fillOpacity=".55" stroke={gold} strokeWidth="1.9"/>
          <path d="M 251 180 L 295 190 M 349 180 L 305 190
            M 274 155 L 270 208 M 326 155 L 330 208"
            fill="none" stroke={cream} strokeWidth="1.15"
            strokeOpacity=".87"/>
          <path d="M 267 190 Q 280 171 292 194
            M 333 190 Q 320 171 308 194"
            fill="none" stroke={cream} strokeOpacity=".73"
            strokeWidth="1.3"/>
          {/* Extra pairs are symmetrical and grow in ornament complexity. */}
          {Array.from({ length: Math.min(3, plan.filigreePairs) }, (_, i) => (
            <g key={i} stroke={cream} fill="none" strokeWidth=".85"
              strokeOpacity={.6 - i * .1}>
              <path d={`M ${264 - i * 3} ${182 + i * 6} Q 280 ${168 + i * 4} 294 194`}/>
              <path d={`M ${336 + i * 3} ${182 + i * 6} Q 320 ${168 + i * 4} 306 194`}/>
            </g>
          ))}
        </g>
      ))}

      {/* Every individual friend adds one fivefold set of tiny capiz jewels:
          a recognizable change after +1 while the overall composition stays
          symmetrical. Stored lights inside the center still own the identity. */}
      <g data-testid="friend-capiz-inlays"
        data-inlay-count={Math.min(friendCount, 50) * 5}>
        {Array.from({ length: Math.min(friendCount, 50) }, (_, friendIndex) =>
          Array.from({ length: 5 }, (_, sector) => {
            const { x, y } = friendInlayPosition(friendIndex, sector)
            const jewelColor = friendIndex % 3 === 0 ? cream : friendIndex % 3 === 1 ? rose : gold
            return (
              <g key={`${sector}-${friendIndex}`}>
                <path d={`M ${x.toFixed(2)} ${(y - 3.1).toFixed(2)}
                  L ${(x + 2.4).toFixed(2)} ${y.toFixed(2)}
                  L ${x.toFixed(2)} ${(y + 3.1).toFixed(2)}
                  L ${(x - 2.4).toFixed(2)} ${y.toFixed(2)} Z`}
                  fill={jewelColor} fillOpacity=".77"
                  stroke="#fff4d5" strokeWidth=".7" />
                <circle cx={x} cy={y - 1} r=".7" fill="#fffefa" />
              </g>
            )
          })
        )}
      </g>

      {/* Decorative punta border: embossed scalloped capiz lace, no bare
          circles. A design family's edge shape remains recognisable. */}
      {Array.from({ length: puntetas }, (_, index) => {
        const point = outerMotifPosition(friendCount, index)
        const sectorSlot = index % (puntetas / 5)
        return (
          <g key={index}>
            <path d={outerPetalPath(friendCount, recipe.key, index)}
              fill={sectorSlot % 2 ? rose : gold}
              fillOpacity={recipe.wave === 'lace' ? '.23' : '.38'}
              stroke={cream} strokeOpacity=".81" strokeWidth="1.15"/>
            {sectorSlot % 2 === 0 && (
              <circle cx={point.x} cy={point.y} r="1.8"
                fill="#fff2cd" opacity=".94"/>
            )}
          </g>
        )
      })}

      {/* Wirework palimbun lines: tiny repeating loop-and-bead lattice, each
          full sector filled so fivefold balance survives every friend count. */}
      {Array.from({ length: plan.scallops }, (_, index) => {
        const a = -Math.PI / 2 + index * TAU / plan.scallops
        const p1 = polarPoint(radius - 27, a)
        const p2 = polarPoint(radius - 17, a + TAU / (plan.scallops * 2))
        const p3 = polarPoint(radius - 27, a + TAU / plan.scallops)
        return (
          <g key={index}>
            <path d={`M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}
              Q ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}
              ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`}
              fill="none" stroke={cream} strokeOpacity=".52" strokeWidth="1.0"/>
          </g>
        )
      })}

      {/* Micro jewel bulbs embedded in the raised foil frame. More friends
          illuminate increasingly fine detail without visual clutter. */}
      {Array.from({ length: plan.bulbs }, (_, index) => {
        const a = -Math.PI / 2 + index * TAU / plan.bulbs
        const p = polarPoint(radius - 4, a)
        const warmBulb = index % 5 === 0
        return (
          <g key={index}>
            <circle cx={p.x} cy={p.y} r={warmBulb ? 5.3 : 3.8}
              fill={warmBulb ? gold : cream} opacity=".17"
              filter={`url(#${uid}-soft-glow)`}/>
            <circle cx={p.x} cy={p.y} r={warmBulb ? 3 : 2}
              fill={warmBulb ? cream : index % 3 === 0 ? rose : gold}
              stroke="#fff9dc" strokeWidth=".45"/>
          </g>
        )
      })}

      {/* Small diamond and star jewels: fivefold blocks, progressively placed
          as full groups rather than a stray ornament on one side. */}
      {Array.from({ length: plan.starlets }, (_, index) => {
        const a = -Math.PI / 2 + index * TAU / plan.starlets
        const p = polarPoint(radius - 59 - phase * .12, a)
        const size = 5 + phase * .14
        return (
          <g key={index}>
            <polygon points={insetStarPoints(p.x, p.y, size, size * .46)}
              fill={index % 5 === 0 ? rose : cream} fillOpacity=".55"
              stroke={gold} strokeWidth=".9"/>
          </g>
        )
      })}

      {pattern === 'rings' && (
        <path d={outerShellPath(friendCount, recipe.key, 2)}
          fill="none" stroke={cream} strokeWidth="1.5"
          strokeDasharray="2 7" opacity=".65" />
      )}
      {pattern === 'rays' && Array.from({ length: 20 }, (_, index) => (
        <g key={index} transform={`rotate(${index * 18} 300 302)`}>
          <path d="M 300 150 L 300 181" stroke={cream}
            strokeOpacity=".9" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 297 160 L 300 154 L 303 160"
            fill="none" stroke={gold} strokeWidth="1.3"/>
        </g>
      ))}
      {/* A few stronger glass jewels add the sense of a real lit object. */}
      {Array.from({ length: 5 }, (_, index) => (
        <g key={index} transform={`rotate(${index * 72} 300 302)`}>
          <circle cx="300" cy={tipY + 9} r="7" fill={glow} opacity=".6"/>
          <circle cx="300" cy={tipY + 9} r="2.3" fill="#fffef5"/>
        </g>
      ))}
    </g>
  )
}
