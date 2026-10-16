import { useEffect, useState } from 'react'
import {
  createInvitation,
  getInvitations,
  revokeInvitation,
  type InvitationInfo,
} from '../../lib/api'

function invitationUrl(token: string): string {
  // The fragment is never sent as an HTTP URL/path or referrer to the server.
  return `${window.location.origin}/#/invite/${encodeURIComponent(token)}`
}

export default function InvitationManager() {
  const [links, setLinks] = useState<InvitationInfo[]>([])
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    void getInvitations()
      .then(items => { if (active) setLinks(items) })
      .catch(() => { if (active) setError('Unable to load invitation history.') })
    return () => { active = false }
  }, [])

  async function generate() {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const issued = await createInvitation()
      setUrl(invitationUrl(issued.token))
      setLinks(await getInvitations())
      setNotice('Your invitation is ready. Copy and share the link below.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create invitation.')
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setNotice('Invitation link copied.')
    } catch {
      setError('Could not copy automatically. Select the link below to copy it.')
    }
  }

  async function revoke(id: string) {
    if (!window.confirm('Revoke this invitation? Friends with this link will no longer be able to contribute. Existing lights remain.')) return
    setBusy(true)
    setError('')
    try {
      await revokeInvitation(id)
      setLinks(await getInvitations())
      setNotice('Invitation revoked. Existing contributions were preserved.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to revoke invitation.')
    } finally {
      setBusy(false)
    }
  }

  const active = links.filter(link =>
    !link.revokedAtUtc && (!link.expiresAtUtc || Date.parse(link.expiresAtUtc) > Date.now()))

  return (
    <section className="rounded-2xl border border-amber-200/25 bg-amber-300/5 p-5" aria-label="Friend invitations">
      <h3 className="text-sm font-bold text-amber-100">Invite your friends</h3>
      <p className="mt-2 text-sm leading-6 text-white/60">
        Give a friend a private invitation link. They can add one light and an optional Christmas message without logging in.
      </p>

      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-400/10 p-3 text-xs text-rose-200">{error}</p>}
      {notice && <p role="status" className="mt-3 text-xs text-amber-200">{notice}</p>}

      <button type="button" disabled={busy} onClick={() => void generate()}
        className="mt-4 w-full rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-slate-900 transition hover:bg-amber-200 disabled:opacity-50">
        {busy ? 'Please wait…' : 'Create invitation link →'}
      </button>

      {url && (
        <div className="mt-4 space-y-2">
          <label htmlFor="invitation-url" className="block text-xs font-semibold text-white/75">Your shareable invitation</label>
          <input id="invitation-url" readOnly value={url} onFocus={event => event.currentTarget.select()}
            className="w-full rounded-lg border border-white/15 bg-[#080e20] px-3 py-3 text-xs text-amber-100" />
          <button type="button" onClick={() => void copy()}
            className="w-full rounded-lg border border-amber-200/40 px-4 py-2.5 text-xs font-bold text-amber-100">
            Copy invitation link
          </button>
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-white/45">
        Creating another link doesn't invalidate earlier ones. Invitations expire after December 31 (Philippine time).
        Your private owner recovery key is never included.
      </p>
      {active.length > 0 && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <h4 className="text-xs font-bold text-amber-100/80">Active invitations ({active.length})</h4>
          <div className="mt-2 space-y-2">
            {active.map((link, index) => (
              <div key={link.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#0e192c] p-2.5">
                <span className="text-xs text-white/65">Invitation {index + 1}</span>
                <button type="button" disabled={busy} onClick={() => void revoke(link.id)}
                  className="rounded-lg border border-rose-300/25 px-3 py-1.5 text-xs text-rose-200 disabled:opacity-50">
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
