import { THEMES } from '../../customization/themes'
import { growthForFriends, outerFitZoom } from '../growth/outerGrowth'
import ParolArtwork from './ParolArtwork'
import ProceduralOuterShell from './ProceduralOuterShell'
import { lightPosition } from './lightPositions'

/**
 * Server-rasterized version of the approved, completed LanternScene.
 * Reuses its exact SVG artwork, default light positions and Fit transform.
 * Never change the underlying growth geometry in the snapshot pipeline.
 * The main browser viewer and its animation remain untouched in Phase 2.
 */
export type ParolSnapshotData = {
  designKey: string
  patternKey: string
  friendCount: number
  slots: number[]
}

export function ParolSnapshot(data: ParolSnapshotData) {
  const theme = THEMES.find(item => item.key === data.designKey) ?? THEMES[0]
  const growthCount = growthForFriends(data.friendCount)
  const fit = outerFitZoom(growthCount)

  return (
    <div style={{ width: 1200, height: 1280, background: 'transparent' }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1280"
        viewBox="0 0 600 640" preserveAspectRatio="xMidYMid meet">
        <g transform={`translate(300 302) scale(${fit}) translate(-300 -302)`}>
          <ProceduralOuterShell theme={theme} growthCount={growthCount} pattern={data.patternKey} />
          <ParolArtwork theme={theme} pattern={data.patternKey} />
          <g className="parol-contributions">
            {data.slots.map(slot => {
              const { x, y, radius } = lightPosition(slot)
              const color = theme.colors[slot % theme.colors.length]
              return (
                <g key={slot}>
                  <circle cx={x} cy={y} r={radius * 2.8} fill={color} opacity=".27" />
                  <circle cx={x} cy={y} r={radius * 1.7} fill={color} opacity=".48" />
                  <circle cx={x} cy={y} r={radius} fill={color}
                    stroke="#fff9e6" strokeWidth=".9" />
                  <circle cx={x - radius * .2} cy={y - radius * .2}
                    r={radius * .32} fill="#fffef5" />
                </g>
              )
            })}
          </g>
        </g>
      </svg>
    </div>
  )
}
