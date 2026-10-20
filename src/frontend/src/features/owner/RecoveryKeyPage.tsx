import { useState } from 'react'

type Props = { code: string; onContinue: () => Promise<void>; onCancel?: () => Promise<void> }

export default function RecoveryKeyPage({ code, onContinue, onCancel }: Props) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try { await action() }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Please try again.') }
    finally { setBusy(false) }
  }

  function cancel() {
    if (!onCancel || !window.confirm('Cancel this new parol? Its parol and recovery key will be permanently deleted.')) return
    void run(onCancel)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080e20] px-5 py-12 text-[#fff7e5]">
      <section className="w-full max-w-lg rounded-3xl border border-amber-300/25 bg-[#131e35] p-6 shadow-xl sm:p-10">
        <div className="text-4xl text-amber-300" aria-hidden="true">✦</div>
        <h1 className="mt-4 font-serif text-3xl font-semibold">Save your recovery key</h1>
        <p className="mt-3 text-sm leading-7 text-white/65">
          Your parol is protected by a private browser session. Save this key in a safe place.
          This original recovery key is valid for one year and can be reused during that year, even after restoring access. Save it for another device or after clearing browser data.
        </p>
        <div className="mt-6 rounded-xl border border-white/15 bg-[#080e20] p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-white/50">Private key — shown only now</p>
          <code className="mt-3 block break-all font-mono text-sm leading-7 text-amber-200" data-testid="recovery-key">{code}</code>
          <button type="button" onClick={() => void copy()} className="mt-4 rounded-lg border border-amber-300/30 px-4 py-2.5 text-sm font-semibold text-amber-100">
            {copied ? 'Copied' : 'Copy recovery key'}
          </button>
        </div>
        <p className="mt-4 text-xs leading-6 text-rose-200/85">
          Treat this key like a password. Don't send it to friends, post it on social media, or save it in your public invitation link.
          We cannot restore your parol if both your browser session and recovery key are lost.
        </p>
        <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm leading-6 text-white/75">
          <input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)}
            className="mt-1 h-4 w-4 accent-amber-300" />
          I have saved my recovery key somewhere private.
        </label>
        {error && <p role="alert" className="mt-5 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</p>}
        <div className="mt-6 flex gap-3">
          {onCancel && <button type="button" disabled={busy} onClick={cancel}
            className="min-w-0 flex-1 rounded-xl border border-rose-400/50 bg-rose-500/15 px-4 py-3.5 text-sm font-bold text-rose-100 hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-40">
            {busy ? 'Please wait…' : 'Cancel'}
          </button>}
          <button type="button" disabled={!acknowledged || busy} onClick={() => void run(onContinue)}
            className="min-w-0 flex-1 rounded-xl bg-amber-300 px-4 py-3.5 text-sm font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-40">
            Continue to my parol →
          </button>
        </div>
      </section>
    </main>
  )
}
