import { useEffect, useRef, useState } from 'react'
import {
  getOwnerRecoveryKey, replaceOwnerRecoveryKey, type OwnerRecoveryKey,
} from '../../lib/api'

type Props = {
  mode: 'view' | 'leave'
  onClose: () => void
  onLeave: () => Promise<void>
}

/**
 * The recovery code is fetched only on demand into component state and removed
 * when the dialog unmounts. It is never put in localStorage or a URL.
 */
export default function RecoveryKeyDialog({mode, onClose, onLeave}: Props) {
  const [recovery, setRecovery] = useState<OwnerRecoveryKey | null>(null)
  const [loading, setLoading] = useState(true)
  const [replacing, setReplacing] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const codeInput = useRef<HTMLInputElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const busy = replacing || leaving
  const busyRef = useRef(false)
  useEffect(() => { busyRef.current = busy }, [busy])
  const code = recovery?.available ? recovery.recoveryCode : null
  const expired = recovery !== null && new Date(recovery.expiresAtUtc).getTime() <= Date.now()
  const expiryDate = recovery ? new Date(recovery.expiresAtUtc).toLocaleDateString() : ''

  useEffect(() => {
    let active = true
    void getOwnerRecoveryKey()
      .then(value => { if (active) setRecovery(value) })
      .catch(caught => {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load your recovery key.')
      })
      .finally(() => { if (active) setLoading(false) })

    heading.current?.focus()
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      active = false
      document.body.style.overflow = oldOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  async function copyRecovery() {
    if (!code) return
    setError('')
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      codeInput.current?.select()
      setError('Automatic copying is unavailable. Select and copy the key in the field above.')
    }
  }

  async function replaceRecovery() {
    if (busy || !window.confirm(
      'Generate a new recovery key? Your previous recovery key will immediately stop working. ' +
      'This does NOT remove your parol or change your invitation link. Continue?',
    )) return
    setReplacing(true)
    setCopied(false)
    setError('')
    try {
      const result = await replaceOwnerRecoveryKey()
      setRecovery(result)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to replace your recovery key.')
    } finally {
      setReplacing(false)
    }
  }

  async function leaveParol() {
    if (busy || loading) return
    setLeaving(true)
    setError('')
    try { await onLeave() }
    catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to leave your parol.')
      setLeaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#112319]/80 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="owner-recovery-dialog-title"
        className="w-full max-w-lg rounded-[26px] border border-[#e7d7c1] bg-[#fffaf3] p-6 text-[#283d31] shadow-2xl sm:p-8">
        <h2 ref={heading} tabIndex={-1} id="owner-recovery-dialog-title"
          className="mt-2 font-serif text-2xl font-semibold outline-none sm:text-3xl">
          {mode === 'leave' ? 'Save your key before leaving.' : 'Your recovery key.'}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#746b5c]">
          {mode === 'leave'
            ? 'This browser will be signed out. Save your recovery key to return to the same parol later.'
            : 'Keep this code somewhere private so you can recover this parol in another browser or device.'}
        </p>

        {loading ? <p role="status" className="mt-6 rounded-xl bg-[#f1e7d6] p-4 text-sm">
          Loading your recovery key…
        </p> : code ? (
          <div className="mt-6 rounded-2xl border border-[#dcc6a7] bg-[#f5ecde] p-4">
            <label htmlFor="owner-recovery-code" className="block text-xs font-semibold uppercase tracking-widest text-[#806849]">
              Your recovery key
            </label>
            <input ref={codeInput} id="owner-recovery-code" readOnly value={code}
              onFocus={event => event.currentTarget.select()}
              autoComplete="off" spellCheck={false}
              className="mt-3 w-full rounded-xl border border-[#deccaf] bg-white px-3 py-3.5 font-mono text-sm text-[#832832]" />
            <button type="button" onClick={() => void copyRecovery()} disabled={busy}
              className="mt-3 w-full rounded-xl bg-[#902632] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
              {copied ? '✓ Recovery key copied' : 'Copy recovery key'}
            </button>
            <p className="mt-3 text-xs leading-5 text-[#756856]">
              Valid until {expiryDate}.
              Do not share this key with friends or include it in invitation links.
            </p>
          </div>
        ) : recovery ? (
          <div className="mt-6 rounded-2xl border border-[#e2c6ab] bg-[#faeee4] p-4">
            <h3 className="font-semibold text-[#86313b]">{expired
              ? 'Your previous recovery key has expired.'
              : 'Your earlier key can’t be displayed.'}</h3>
            <p className="mt-2 text-sm leading-6 text-[#746152]">
              {expired
                ? 'Your earlier key is no longer valid. While this owner session is active, you may generate a new key for another year.'
                : 'This parol was created before keys could be securely displayed again. Your existing key still works if saved. You can keep using it, or explicitly replace it.'}
            </p>
            <button type="button" onClick={() => void replaceRecovery()} disabled={busy}
              className="mt-4 w-full rounded-xl bg-[#902632] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
              {replacing ? 'Generating…' : 'Generate a replacement key'}
            </button>
            <p className="mt-2 text-xs leading-5 text-[#9c3a40]">
              Replacing invalidates the previous recovery key immediately. This does not change the
              current owner session, parol, friends, or invitation link.
            </p>
          </div>
        ) : <p className="mt-6 text-sm text-[#86313b]">
          The recovery key could not be retrieved. Your session has not been changed.
        </p>}

        {error && <p role="alert" className="mt-4 rounded-xl border border-[#e5aba4] bg-[#fbe9e6] p-3 text-sm text-[#922632]">
          {error}
        </p>}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" disabled={busy} onClick={onClose}
            className={`rounded-xl border border-[#d8c5aa] bg-white px-4 py-3 text-sm font-semibold text-[#534e41] disabled:opacity-50 ${mode === 'view' ? 'col-span-2' : ''}`}>
            {mode === 'leave' ? 'Stay here' : 'Close'}
          </button>
          {mode === 'leave' && <button type="button" disabled={busy || loading}
            onClick={() => void leaveParol()}
            className="rounded-xl bg-[#263e31] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
            {leaving ? 'Leaving…' : code ? 'Leave parol' : 'Leave anyway'}
          </button>}
        </div>
      </section>
    </div>
  )
}
