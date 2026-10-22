import { useEffect, useRef, useState } from 'react'
import { createInvitation } from '../../lib/api'
import { invitationUrl } from './invitationLinks'

export default function InvitationManager() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [showLinkPage, setShowLinkPage] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [copyError, setCopyError] = useState('')
  const linkInput = useRef<HTMLInputElement>(null)

  // The endpoint always returns the same official invitation, including after refresh.
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
      setCopyError('Could not copy automatically. Select the link to copy it manually.')
    }
  }

  return (
    <section className="rounded-2xl border border-amber-200/25 bg-amber-300/5 p-5" aria-label="Friend invitations">
      <h3 className="text-sm font-bold text-amber-100">Your parol invitation</h3>
      <p className="mt-2 text-sm leading-6 text-white/60">
        Share the same invitation with all your friends. Each friend can add one light and an optional Christmas message without an account.
      </p>

      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-400/10 p-3 text-xs text-rose-200">{error}</p>}
      {loading ? <p className="mt-4 text-sm text-white/55">Preparing your invitation…</p> : (
        <div className="mt-4 space-y-3">
          {url && (
            <>
              <label htmlFor="invitation-url" className="block text-xs font-semibold text-white/75">One link for your whole parol</label>
              <input id="invitation-url" readOnly value={url} onFocus={event => event.currentTarget.select()}
                className="w-full rounded-lg border border-white/15 bg-[#080e20] px-3 py-3 text-xs text-amber-100" />
            </>
          )}
          <button type="button" disabled={busy} onClick={() => void showInvitation()}
            className="w-full rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-slate-900 transition hover:bg-amber-200 disabled:opacity-50">
            {busy ? 'Preparing…' : url ? 'View invitation link' : 'Create invitation link'}
          </button>
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-white/45">
        This link stays the same for the current Christmas season and expires on December 31 (Philippine time).
        Your private recovery key is never included.
      </p>

      {showLinkPage && (
        <div role="dialog" aria-modal="true" aria-labelledby="invitation-ready-title"
          className="fixed inset-0 z-50 flex min-h-screen items-center justify-center overflow-y-auto bg-[#080e20] px-5 py-10 text-[#fff7e5]">
          <div className="w-full max-w-lg rounded-3xl border border-amber-300/25 bg-[#131e35] p-6 shadow-2xl sm:p-10">
            <div className="text-4xl text-amber-300" aria-hidden="true">✦</div>
            <h2 id="invitation-ready-title" className="mt-4 font-serif text-3xl font-semibold">Your invitation link is ready</h2>
            <p className="mt-3 text-sm leading-6 text-white/60">Copy this link and send it to a friend so they can add a light to your parol.</p>
            <label htmlFor="invitation-popup-url" className="mt-6 block text-xs font-bold uppercase tracking-widest text-white/60">Shareable link</label>
            <input ref={linkInput} id="invitation-popup-url" readOnly value={url}
              onFocus={event => event.currentTarget.select()}
              className="mt-2 w-full rounded-xl border border-white/15 bg-[#080e20] px-4 py-3.5 text-sm text-amber-100" />
            {copyError && <p role="alert" className="mt-3 text-sm text-rose-200">{copyError}</p>}
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => void copy()}
                className="min-w-0 flex-1 rounded-xl bg-amber-300 px-4 py-3.5 text-sm font-bold text-slate-900 hover:bg-amber-200">
                {copied ? 'Copied!' : 'Copy link'}
              </button>
              <button type="button" onClick={() => setShowLinkPage(false)}
                className="min-w-0 flex-1 rounded-xl border border-white/25 px-4 py-3.5 text-sm font-bold text-white hover:bg-white/10">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
