import { useEffect, useState } from 'react'
import { createInvitation } from '../../lib/api'
import { invitationUrl } from './invitationLinks'
import StoryShare from '../story/StoryShare'
import type { Lantern } from '../../lib/api'

export default function InvitationManager({lantern}: {lantern: Lantern | null}) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [copyError, setCopyError] = useState('')

  // The API returns the existing official invitation, never a new one on refresh.
  useEffect(() => {
    let active = true
    void createInvitation()
      .then(issued => {
        if (active) setUrl(invitationUrl(window.location.origin, issued.token))
      })
      .catch(caught => {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load your invitation.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function copy() {
    if (!url) return
    setCopyError('')
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
      setCopyError('Could not copy automatically. Tap the visible link to select it manually.')
    }
  }

  return (
    <>
    <section aria-label="Friend invitations"
      className="overflow-hidden rounded-[24px] border border-[#7a2530] bg-[linear-gradient(145deg,#902632,#721e2a)] p-5 text-[#fff8ea] shadow-[0_18px_35px_rgba(111,38,43,.13)] sm:p-6">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="rounded-xl bg-white/10 p-3 text-xl">✉</span>
        <div>
          <h2 className="mt-1 font-serif text-2xl font-semibold">Invite your friends</h2>
          <p className="mt-2 text-sm leading-6 text-white/80">
            Share this link to grow your parol together.
          </p>
        </div>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-white/25 bg-black/20 p-3 text-sm">{error}</p>}
      {loading ? <p role="status" className="mt-4 text-sm text-[#ffe0be]">Preparing your invitation…</p> : (
        <div className="mt-5 space-y-3">
          {url && <>
            <label htmlFor="invitation-url" className="block text-xs font-semibold text-[#ffe3d2]">
              Your personal invitation link
            </label>
            <input id="invitation-url" readOnly value={url}
              onFocus={event => event.currentTarget.select()}
              className="w-full rounded-xl border border-white/20 bg-white px-3 py-3.5 text-xs text-[#392e2d] outline-offset-2" />
          </>}
          {copyError && <p role="alert" className="text-xs text-[#ffe4a9]">{copyError}</p>}
          <button type="button" disabled={!url} onClick={() => void copy()}
            className="w-full rounded-xl bg-[#ffefdc] px-4 py-3.5 text-sm font-bold text-[#7a2530] transition hover:bg-white disabled:opacity-40">
            {copied ? '✓ Link copied!' : 'Copy invitation link'}
          </button>
        </div>
      )}
      <p className="mt-4 text-xs leading-5 text-[#f5d4c7]">
        Link expires December 31. Your recovery key stays private.
      </p>
    </section>
    {lantern && url && <section aria-label="Share your parol Story"
      className="rounded-[24px] border border-[#e3d7c5] bg-[#fffdf8] p-5 shadow-[0_10px_30px_rgba(57,43,27,.05)] sm:p-6">
      <h2 className="mb-4 font-serif text-2xl text-[#283b2f]">Share your parol</h2>
      <StoryShare invitationUrl={url} data={{
        kind:'owner', designKey:lantern.designKey, patternKey:lantern.patternKey,
        friendCount:lantern.acceptedFriends,
        slots:lantern.lights.map(light => light.slotIndex), highlightSlot:null,
      }} />
    </section>}
    </>
  )
}
