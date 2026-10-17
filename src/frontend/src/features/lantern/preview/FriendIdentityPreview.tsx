import { useState } from 'react'
import type { Theme } from '../../customization/themes'
import ParolArtwork from '../renderer/ParolArtwork'
import { lightPosition } from '../renderer/lightPositions'
import {
  DESIGN_MILESTONES,
  PREVIEW_MAX_FRIENDS,
  lastReachedMilestone,
  nextMilestone,
  ringAutoFitScale,
  ringRadius,
} from './friendRingGeometry'

type IdentityMode = 'ring' | 'star' | 'both'
type Props = { theme: Theme; pattern: string }

const RING_DOTS = 26
const CENTER_X = 300
const CENTER_Y = 302

const identityOptions: readonly { key: IdentityMode; label: string }[] = [
  { key: 'ring', label: 'Friend on ring' },
  { key: 'star', label: 'Friend in star' },
  { key: 'both', label: 'Both (recommended)' },
]

/**
 * A non-saving UX experiment. It leaves LanternScene, the real guest lights,
 * API calls and stored friend/design counts entirely untouched.
 */
export default function FriendIdentityPreview({ theme, pattern }: Props) {
  const [friendCount, setFriendCount] = useState(0)
  const [identityMode, setIdentityMode] = useState<IdentityMode>('both')
  const [selectedFriend, setSelectedFriend] = useState<number | null>(null)
  const scale = ringAutoFitScale(friendCount)
  const reached = lastReachedMilestone(friendCount)
  const next = nextMilestone(friendCount)
  const slots = Array.from({ length: friendCount }, (_, index) => index)

  function useFriendCount(nextCount: number) {
    const count = Math.max(0, Math.min(PREVIEW_MAX_FRIENDS, nextCount))
    setFriendCount(count)
    setSelectedFriend(count === 0 ? null : count > friendCount ? count - 1 : null)
  }

  return (
    <section className="space-y-4 rounded-2xl border border-amber-300/20 bg-[#0a1428]/90 p-3 sm:p-5" aria-label="Experimental friend ring and identity preview">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300">Friend growth testing lab</p>
          <h3 className="mt-1 font-serif text-xl text-white">One new ring for every friend</h3>
          <p className="mt-1 max-w-lg text-xs leading-5 text-white/55">
            Compare where each friend is recognized. Rings grow and the camera automatically zooms out.
          </p>
        </div>
        <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold text-amber-200">
          Preview only · Not saved
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Friend identity placement">
        {identityOptions.map(option => (
          <button
            key={option.key}
            type="button"
            aria-pressed={identityMode === option.key}
            className={'rounded-full border px-3 py-2 text-xs font-semibold transition ' +
              (identityMode === option.key
                ? 'border-amber-300 bg-amber-300/15 text-amber-100'
                : 'border-white/15 bg-white/5 text-white/65 hover:border-white/35')}
            onClick={() => setIdentityMode(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(circle_at_50%_45%,#243148_0%,#0d172b_65%,#080e1d_100%)]">
        <svg
          viewBox="0 0 600 640"
          preserveAspectRatio="xMidYMid meet"
          className="block h-auto w-full"
          role="img"
          aria-label={`${theme.label} parol with ${friendCount} preview friends, ${friendCount} concentric outer rings. Identity shown ${identityMode === 'ring' ? 'on each ring' : identityMode === 'star' ? 'on the star' : 'on rings and star'}.`}
        >
          <g
            style={{
              transform: `scale(${scale})`,
              transformOrigin: '300px 302px',
              transition: 'transform 420ms ease-in-out',
            }}
          >
            <g className="preview-friend-rings">
              {slots.map(slot => {
                const radius = ringRadius(slot)
                const color = theme.colors[slot % theme.colors.length]
                const selected = selectedFriend === slot
                const angle = -Math.PI / 2 + slot * (Math.PI * (3 - Math.sqrt(5)))
                const markerX = CENTER_X + Math.cos(angle) * radius
                const markerY = CENTER_Y + Math.sin(angle) * radius
                return (
                  <g key={slot}>
                    <circle cx={CENTER_X} cy={CENTER_Y} r={radius} fill="none"
                      stroke={selected ? '#fff3bf' : color}
                      strokeWidth={selected ? 3.4 : 1.8}
                      strokeOpacity={selected ? 1 : 0.48} />
                    {Array.from({ length: RING_DOTS }, (_, dot) => {
                      const a = dot * 2 * Math.PI / RING_DOTS
                      return <circle key={dot} cx={CENTER_X + Math.cos(a) * radius}
                        cy={CENTER_Y + Math.sin(a) * radius}
                        r={selected ? 3.2 : 2.3} fill={selected ? '#fff9db' : color} opacity=".9" />
                    })}
                    {identityMode !== 'star' && (
                      <g onClick={() => setSelectedFriend(slot)} style={{ cursor: 'pointer' }}>
                        <title>{`Friend ${slot + 1} · Ring ${slot + 1}`}</title>
                        <circle cx={markerX} cy={markerY} r={selected ? 12 : 9} fill={color} opacity=".27" />
                        <circle cx={markerX} cy={markerY} r={selected ? 7 : 5.8}
                          fill="#fff8d8" stroke={color} strokeWidth="2.2" />
                      </g>
                    )}
                  </g>
                )
              })}
            </g>
            <ParolArtwork theme={theme} friendCount={0} pattern={pattern} />
            {identityMode !== 'ring' && (
              <g className="preview-star-identities">
                {slots.map(slot => {
                  const { x, y, radius } = lightPosition(slot)
                  const color = theme.colors[slot % theme.colors.length]
                  const selected = selectedFriend === slot
                  return (
                    <g key={slot} onClick={() => setSelectedFriend(slot)} style={{ cursor: 'pointer' }}>
                      <title>{`Friend ${slot + 1} · Star light`}</title>
                      <circle cx={x} cy={y} r={radius * (selected ? 4.5 : 3)}
                        fill={color} opacity={selected ? '.56' : '.28'} />
                      <circle cx={x} cy={y} r={radius * (selected ? 1.7 : 1)}
                        fill={selected ? '#fff9d7' : color} stroke="#fff7e2" strokeWidth={selected ? 2 : .8} />
                    </g>
                  )
                })}
              </g>
            )}
          </g>
        </svg>
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-[#0a1428]/85 px-3 py-1.5 text-[11px] text-white/70">
          Auto-fit · {Math.round(scale * 100)}% scale
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-center">
        <div><p className="text-lg font-bold text-amber-200">{friendCount}</p><p className="text-[11px] text-white/50">Test friends</p></div>
        <div><p className="text-lg font-bold text-amber-200">{friendCount}</p><p className="text-[11px] text-white/50">Outer rings</p></div>
        <div><p className="text-lg font-bold text-amber-200">{reached}</p><p className="text-[11px] text-white/50">Milestone reached</p></div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" disabled={friendCount === 0} onClick={() => useFriendCount(friendCount - 1)}
          className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/80 transition hover:border-amber-300/60 disabled:opacity-35">
          −1 friend
        </button>
        <button type="button" disabled={friendCount >= PREVIEW_MAX_FRIENDS} onClick={() => useFriendCount(friendCount + 1)}
          className="rounded-xl bg-amber-300 px-5 py-3 text-sm font-bold text-[#151b27] transition hover:bg-amber-200 disabled:opacity-35">
          + Add test friend
        </button>
        <button type="button" disabled={friendCount === 0} onClick={() => useFriendCount(0)}
          className="rounded-xl border border-white/15 px-4 py-3 text-sm text-white/70 transition hover:border-white/35 disabled:opacity-35">
          Reset
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2" aria-label="Jump to a friend milestone">
        <span className="text-xs text-white/45">Jump to:</span>
        {DESIGN_MILESTONES.map(count => (
          <button key={count} type="button" onClick={() => useFriendCount(count)}
            aria-pressed={friendCount === count}
            className={'rounded-full border px-3 py-1.5 text-xs transition ' +
              (friendCount === count ? 'border-amber-300 text-amber-200' : 'border-white/15 text-white/60 hover:border-white/40')}>
            {count}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-3">
        <div>
          <p className="text-xs font-semibold text-white/80">
            {next === null ? 'Final design milestone reached' : `Next design milestone: ${next} friends`}
          </p>
          <p className="mt-1 text-xs text-white/45">These unlock thresholds are proposed, not yet enforced in the app.</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-white/70" htmlFor="friend-identity-select">
          Highlight
          <select id="friend-identity-select"
            value={selectedFriend === null || selectedFriend >= friendCount ? '' : selectedFriend}
            onChange={event => setSelectedFriend(event.target.value === '' ? null : Number(event.target.value))}
            disabled={friendCount === 0}
            className="max-w-36 rounded-lg border border-white/20 bg-[#101c34] p-2 text-white">
            <option value="">None</option>
            {slots.map(slot => <option key={slot} value={slot}>Friend {slot + 1}</option>)}
          </select>
        </label>
      </div>
      <p className="text-center text-xs leading-5 text-white/45">
        Test identities are placeholders. No friend is created, no database update is made,
        and the live parol remains unchanged.
      </p>
    </section>
  )
}
