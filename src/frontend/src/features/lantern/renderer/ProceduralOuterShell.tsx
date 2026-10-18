import { useId } from 'react'
import type { Theme } from '../../customization/themes'
import {
  friendStarLayers,
  friendStarBandPath,
  friendStarFacetPath,
  lowerRibbonAnchors,
  OUTER_RECIPES,
  outerRadiusForFriends,
  starNotchPosition,
  starOutlinePath,
  starTipPosition,
  starVertices,
} from '../growth/outerGrowth'

type Props = { theme: Theme; friendCount: number; pattern: string }
const CX = 300
const CY = 302

/** The five-pointed, capiz-style outer structure is genuinely layered.
 * 50 accepted friends produce 50 visible, filled, decorated star bands,
 * rather than the 2–3 huge empty circular contours of the old prototype.
 */
export default function ProceduralOuterShell({ theme, friendCount, pattern }: Props) {
  const uid = useId().replace(/:/g, '')
  const [gold, ivory, rose, jade] = theme.colors
  const recipe = OUTER_RECIPES[theme.key]
  const layers = friendStarLayers(friendCount)
  const outerRadius = outerRadiusForFriends(friendCount)
  const ribbonAnchors = lowerRibbonAnchors(friendCount)
  const metallic = `url(#${uid}-metallic)`
  const capiz = `url(#${uid}-capiz)`
  const bright = `url(#${uid}-light)`
  const palette = [gold, rose, jade, ivory] as const

  return (
    <g data-testid="living-outer-shell" data-friends={friendCount}
      data-layer-count={layers.length} data-recipe={recipe.key}
      className="parol-ornament-reveal" aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-metallic`} x1="0%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor={ivory} stopOpacity=".89"/>
          <stop offset="38%" stopColor={gold} stopOpacity=".83"/>
          <stop offset="65%" stopColor={rose} stopOpacity=".72"/>
          <stop offset="100%" stopColor={jade} stopOpacity=".73"/>
        </linearGradient>
        <linearGradient id={`${uid}-capiz`} x1="4%" y1="3%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#fff6d7" stopOpacity=".84"/>
          <stop offset="35%" stopColor={ivory} stopOpacity=".57"/>
          <stop offset="65%" stopColor={rose} stopOpacity=".59"/>
          <stop offset="100%" stopColor={jade} stopOpacity=".68"/>
        </linearGradient>
        <radialGradient id={`${uid}-light`}>
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="35%" stopColor={ivory}/>
          <stop offset="75%" stopColor={gold} stopOpacity=".75"/>
          <stop offset="100%" stopColor={gold} stopOpacity="0"/>
        </radialGradient>
        <filter id={`${uid}-glow`} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="3"/>
        </filter>
      </defs>

      {/* The string and all five tails move to the newest outer structure.
          They are not allowed to remain at the original center star. */}
      <path d={`M ${CX} ${(CY - outerRadius - 72).toFixed(2)}
        Q ${CX - 7} ${(CY - outerRadius - 40).toFixed(2)}
        ${CX} ${(CY - outerRadius - 5).toFixed(2)}`}
        fill="none" stroke={ivory} strokeWidth="2.3" opacity=".81"/>
      <circle cx={CX} cy={CY - outerRadius - 8} r="8.2"
        fill="#142136" stroke={gold} strokeWidth="2.7"/>
      <circle cx={CX} cy={CY - outerRadius - 8} r="2.8" fill={ivory}/>

      <g data-testid="outer-tassels">
        {ribbonAnchors.map(({ x, y }, index) => {
          const shift = index - 2
          const silk = palette[(index + 1) % palette.length]
          const bottom = y + 133 + (index % 2) * 9
          return (
            <g key={index}>
              <path d={`M ${x.toFixed(2)} ${y.toFixed(2)}
                Q ${(x + shift * 7).toFixed(2)} ${(y + 49).toFixed(2)}
                ${(x + shift * 4).toFixed(2)} ${(y + 93).toFixed(2)}
                Q ${(x + shift * 3).toFixed(2)} ${(y + 116).toFixed(2)}
                ${x.toFixed(2)} ${bottom.toFixed(2)}`}
                fill="none" stroke={silk} strokeWidth={index === 2 ? 6 : 4.3}
                strokeOpacity=".87" strokeLinecap="round"/>
              <path d={`M ${(x - 8).toFixed(2)} ${(bottom - 9).toFixed(2)}
                L ${x.toFixed(2)} ${(bottom + 8).toFixed(2)}
                L ${(x + 8).toFixed(2)} ${(bottom - 9).toFixed(2)}`}
                fill="none" stroke={ivory} strokeWidth="2" strokeLinecap="round"/>
              <circle cx={x} cy={bottom - 22} r="4.5"
                fill={rose} stroke={ivory} strokeWidth="1.2"/>
            </g>
          )
        })}
      </g>

      {/* A complete, traditional five-pointed central parol is supplied by
          ParolArtwork on top of these bands. Every outer band is FILLED;
          there is no missing gap between the small star and the new edge. */}
      <g data-testid="friend-star-layers">
        {layers.map(layer => {
          const level = layer.friendNumber
          const color = palette[(level - 1) % palette.length]
          const trim = level % 5 === 0 ? ivory : gold
          const innerPoints = starVertices(layer.innerRadius)
          const outerPoints = starVertices(layer.outerRadius)
          return (
            <g key={level} data-friend-layer={level} className="parol-friend-layer">
              {/* Even-odd removes the center, filling exactly the annular STAR
                  band between layer n-1 and layer n (not a circular ring). */}
              <path d={friendStarBandPath(level)}
                fill={color} fillOpacity=".78"
                fillRule="evenodd" stroke="none"/>
              {/* Ten connecting capiz-glass panels make a continuous mosaic. */}
              {Array.from({ length: 10 }, (_, segment) => {
                const next = (segment + 1) % 10
                const a = innerPoints[segment]
                const b = outerPoints[next]
                const glassTone = palette[(Math.floor(segment / 2) + level) % palette.length]
                return (
                  <g key={segment}>
                    <path d={friendStarFacetPath(level, segment)}
                      fill={segment % 2 === 0 ? glassTone : capiz}
                      fillOpacity={segment % 2 === 0 ? '.42' : '.48'}
                      stroke={ivory} strokeOpacity=".36" strokeWidth=".75"/>
                    <path d={`M ${a.x.toFixed(2)} ${a.y.toFixed(2)}
                      L ${b.x.toFixed(2)} ${b.y.toFixed(2)}`}
                      fill="none" stroke={trim} strokeWidth=".75"
                      strokeOpacity=".58"/>
                    {level % 5 === 0 && (
                      <circle cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2}
                        r="2.1" fill={ivory} opacity=".77"/>
                    )}
                  </g>
                )
              })}
              {/* Fine gold bands remain countable even at 50 friends. */}
              <path d={starOutlinePath(layer.outerRadius)} fill="none"
                stroke={level % 4 === 0 ? ivory : gold}
                strokeWidth={level % 5 === 0 ? 3 : 2.2}
                strokeOpacity={level % 4 === 0 ? '.98' : '.88'}
                strokeLinejoin="round"/>

              {/* Each person brings five matching jewels, distributed to the
                  five star tips (never one random asymmetric ornament). */}
              {Array.from({ length: 5 }, (_, sector) => {
                const pos = starTipPosition(level, sector)
                const notch = starNotchPosition(level, sector)
                const angle = sector * 72
                return (
                  <g key={sector}>
                    <circle cx={pos.x} cy={pos.y} r="5.1" fill={gold} opacity=".21"/>
                    <circle cx={pos.x} cy={pos.y} r="2.4"
                      fill={ivory} stroke={rose} strokeWidth=".75"/>
                    <circle cx={notch.x} cy={notch.y} r="2.1"
                      fill={level % 2 ? rose : jade} stroke={ivory} strokeWidth=".65"/>
                    {recipe.motif === 'diamond' && (
                      <path d="M -4 0 L 0 -7 L 4 0 L 0 7 Z"
                        transform={`translate(${pos.x} ${pos.y}) rotate(${angle})`}
                        fill={metallic} fillOpacity=".86" stroke={ivory} strokeWidth="1"/>
                    )}
                    {(recipe.motif === 'petal' || recipe.motif === 'jasmine') && (
                      <g transform={`translate(${pos.x} ${pos.y}) rotate(${angle})`}>
                        {[-1, 0, 1].map(k => (
                          <ellipse key={k} cx={k * 3.3} cy="-4.5"
                            rx={recipe.motif === 'jasmine' ? 2.7 : 3}
                            ry={recipe.motif === 'jasmine' ? 5.1 : 4.1}
                            fill={k === 0 ? ivory : rose}
                            fillOpacity=".83" stroke={gold} strokeWidth=".62"
                            transform={`rotate(${k * 19} ${k * 3.3} -4.5)`}/>
                        ))}
                        <circle cy="-1" r="1.8" fill={gold}/>
                      </g>
                    )}
                    {recipe.motif === 'fan' && (
                      <path d="M -5 3 L -3 -6 L 0 -3 L 3 -6 L 5 3 Z"
                        transform={`translate(${pos.x} ${pos.y}) rotate(${angle})`}
                        fill={jade} stroke={ivory} strokeWidth=".9"/>
                    )}
                    {recipe.motif === 'star' && (
                      <path d="M 0 -6 L 2 -2 L 6 0 L 2 2 L 0 6 L -2 2 L -6 0 L -2 -2 Z"
                        transform={`translate(${pos.x} ${pos.y})`}
                        fill={ivory} fillOpacity=".8" stroke={gold} strokeWidth=".8"/>
                    )}
                    {recipe.motif === 'sun' && (
                      <path d="M -5 4 L 0 -8 L 5 4 Z"
                        transform={`translate(${pos.x} ${pos.y}) rotate(${angle})`}
                        fill={rose} stroke={ivory} strokeWidth="1"/>
                    )}
                  </g>
                )
              })}
              {pattern === 'rings' && level % 4 === 0 && (
                <path d={starOutlinePath(layer.outerRadius - 3)}
                  fill="none" stroke={ivory} strokeDasharray="2 5"
                  strokeWidth="1.25" strokeOpacity=".7"/>
              )}
              {pattern === 'rays' && level % 5 === 0 && (
                <path d={starOutlinePath(layer.outerRadius - 5)}
                  fill="none" stroke={ivory} strokeWidth="2.1" strokeOpacity=".56"/>
              )}
            </g>
          )
        })}
      </g>

      {/* A brighter, five-pointed outside frame finishes the newest band.
          With zero friends this frames the original complete star. */}
      <path d={starOutlinePath(outerRadius)} fill="none"
        stroke={gold} strokeWidth="10" opacity=".25"
        filter={`url(#${uid}-glow)`}/>
      <path d={starOutlinePath(outerRadius)} fill="none"
        stroke={ivory} strokeWidth="5.2" strokeLinejoin="round"/>
      <path d={starOutlinePath(outerRadius - 5)} fill="none"
        stroke={gold} strokeWidth="1.6" strokeLinejoin="round"/>
      {Array.from({ length: 5 }, (_, sector) => {
        // The final ornate points expand WITH all fifty nested layers.
        const pos = starVertices(outerRadius)[sector * 2]
        return (
          <g key={sector}>
            <circle cx={pos.x} cy={pos.y} r="12" fill={bright} opacity=".9"/>
            <circle cx={pos.x} cy={pos.y} r="3.6"
              fill={ivory} stroke={gold} strokeWidth="1.5"/>
          </g>
        )
      })}
    </g>
  )
}
