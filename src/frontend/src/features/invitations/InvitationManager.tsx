import { useEffect, useRef, useState } from 'react'
import { createInvitation } from '../../lib/api'
import { invitationUrl } from './invitationLinks'
import StoryShare from '../story/StoryShare'
import type { Lantern } from '../../lib/api'

export default function InvitationManager({lantern}: {lantern: Lantern | null}) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [showLinkPage, setShowLinkPage] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [copyError, setCopyError] = useState('')
  const linkInput = useRef<HTMLInputElement>(null)

  // Retrieve the ONE reusable official link; never create new links on redraw.
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

  useEffect(() => {
    if (showLinkPage) linkInput.current?.focus()
  }, [showLinkPage])

  async function showInvitation() {
    setBusy(true)
    setError('')
    setCopyError('')
    try {
      const issued = await createInvitation()
      setUrl(invitationUrl(window.location.origin, issued.token))
      setCopied(false)
      setShowLinkPage(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load your invitation.')
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    if (!url) return
    setCopyError('')
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
      setCopyError('Could not copy automatically. Select the link to copy manually.')
    }
  }

  return (
    <section aria-label="Friend invitations" className="overflow-hidden rounded-[24px] border border-[#7a2530] bg-[linear-gradient(145deg,#902632,#721e2a)] p-5 text-[#fff8ea] shadow-[0_18px_35px_rgba(111,38,43,.13)] sm:p-6">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="rounded-xl bg-white/10 p-3 text-xl">✉</span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#f3c7a1]">Share the light</p>
          <h2 className="mt-1 font-serif text-2xl font-semibold">Invite your friends</h2>
          <p className="mt-2 text-sm leading-6 text-white/80">
            Send one special link. Each friend can add a light and a private Christmas greeting without an account.
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
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={!url || busy} onClick={() => void copy()}
              className="rounded-xl bg-[#ffefdc] px-3 py-3 text-sm font-bold text-[#7a2530] transition hover:bg-white disabled:opacity-40">
              {copied ? '✓ Copied!' : 'Copy link'}
            </button>
            <button type="button" disabled={busy} onClick={() => void showInvitation()}
              className="rounded-xl border border-white/35 px-3 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-40">
              {busy ? 'Preparing…' : 'View / share'}
            </button>
          </div>
          {lantern && url && <div className="border-t border-white/20 pt-3">
            <StoryShare invitationUrl={url} data={{
              kind:'owner', designKey:lantern.designKey, patternKey:lantern.patternKey,
              friendCount:lantern.acceptedFriends,
              slots:lantern.lights.map(light => light.slotIndex), highlightSlot:null,
            }} />
          </div>}
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-[#f5d4c7]">
        The invitation lasts until December 31 (Philippine time). Your private recovery key is never shared.
      </p>

      {showLinkPage && <div role="presentation" className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[#15231e]/80 p-4 backdrop-blur-sm">
        <section role="dialog" aria-modal="true" aria-labelledby="invitation-ready-title"
          className="w-full max-w-lg rounded-[26px] bg-[#fffaf2] p-6 text-[#263a2e] shadow-2xl sm:p-9">
          <span aria-hidden="true" className="text-4xl text-[#b18246]">✦</span>
          <h2 id="invitation-ready-title" className="mt-3 font-serif text-3xl font-semibold">Your invitation is ready</h2>
          <p className="mt-3 text-sm leading-6 text-[#716757]">
            Copy this link and send it to friends. They can light up your parol without signing up.
          </p>
          <label htmlFor="invitation-popup-url" className="mt-5 block text-xs font-bold uppercase tracking-widest text-[#7b6c56]">
            Shareable invitation
          </label>
          <input id="invitation-popup-url" ref={linkInput} readOnly value={url}
            onFocus={event => event.currentTarget.select()}
            className="mt-2 w-full rounded-xl border border-[#dacbb6] bg-white px-4 py-3.5 text-sm text-[#283a30]" />
          {copyError && <p role="alert" className="mt-3 text-sm text-[#982632]">{copyError}</p>}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => void copy()}
              className="rounded-xl bg-[#902632] px-4 py-3.5 text-sm font-bold text-white">
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <button type="button" onClick={() => setShowLinkPage(false)}
              className="rounded-xl border border-[#d8c4ac] px-4 py-3.5 text-sm font-bold text-[#554437]">Done</button>
          </div>
        </section>
      </div>}
    </section>
  )
}
