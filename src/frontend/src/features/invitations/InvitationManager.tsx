import { useEffect, useState } from 'react'
import { createInvitation } from '../../lib/api'
import { invitationUrl } from './invitationLinks'

export default function InvitationManager() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // The backend issues at most one official invitation for the current parol.
  // Calling this again after a refresh always returns exactly the same link.
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
    setError('')
    try {
      await navigator.clipboard.writeText(url)
      setNotice('Invitation link copied. Share it with all your friends!')
    } catch {
      setError('Copy was unavailable. Select the link below to copy it manually.')
    }
  }

  return (
    <section className="rounded-2xl border border-amber-200/25 bg-amber-300/5 p-5" aria-label="Friend invitations">
      <h3 className="text-sm font-bold text-amber-100">Your parol invitation</h3>
      <p className="mt-2 text-sm leading-6 text-white/60">
        Share the same invitation with all your friends. Each friend can add one light and an optional Christmas message without an account.
      </p>

      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-400/10 p-3 text-xs text-rose-200">{error}</p>}
      {notice && <p role="status" className="mt-3 text-xs text-amber-200">{notice}</p>}

      {loading ? <p className="mt-4 text-sm text-white/55">Preparing your invitation…</p> : url ? (
        <div className="mt-4 space-y-3">
          <label htmlFor="invitation-url" className="block text-xs font-semibold text-white/75">One link for your whole parol</label>
          <input id="invitation-url" readOnly value={url} onFocus={event => event.currentTarget.select()}
            className="w-full rounded-lg border border-white/15 bg-[#080e20] px-3 py-3 text-xs text-amber-100" />
          <button type="button" onClick={() => void copy()}
            className="w-full rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-slate-900 transition hover:bg-amber-200">
            Copy invitation link
          </button>
        </div>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-white/45">
        This link stays the same for the current Christmas season and expires on December 31 (Philippine time).
        Your private recovery key is never included.
      </p>
    </section>
  )
}
