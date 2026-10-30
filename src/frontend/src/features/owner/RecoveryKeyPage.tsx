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
    <main className="flex min-h-screen items-center justify-center bg-[#f7f2e9] px-4 py-10 text-[#273a30]">
      <section className="w-full max-w-xl rounded-[28px] border border-[#e5d8c4] bg-[#fffdf8] p-6 shadow-[0_16px_45px_rgba(54,43,27,.08)] sm:p-10">
        <div className="font-serif text-2xl font-semibold text-[#27392d]"><span className="text-[#aa7e45]">✦</span> BeMyParol</div>
        <h1 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">Save your recovery key.</h1>
        <p className="mt-3 text-sm leading-7 text-[#70685a]">
          Save this private key to return to your parol on another device.
          It's valid for one year.
        </p>
        <div className="mt-6 rounded-2xl border border-[#d9c5a9] bg-[#f7eee0] p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[#776048]">Your private key</p>
          <code className="mt-3 block break-all rounded-xl border border-[#decbb1] bg-white px-3 py-4 font-mono text-sm leading-7 text-[#7b2a30]"
            data-testid="recovery-key">{code}</code>
          <button type="button" onClick={() => void copy()}
            className="mt-4 rounded-xl bg-[#263f32] px-4 py-3 text-sm font-bold text-white">
            {copied ? '✓ Copied!' : 'Copy recovery key'}
          </button>
        </div>
        <p className="mt-4 rounded-xl bg-[#fae9e5] px-4 py-3 text-xs leading-6 text-[#8e3340]">
          Keep this key private. You can view it while signed in, but you'll need
          your saved copy after leaving. Without a valid session or key, access cannot be restored.
        </p>
        <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#4e564b]">
          <input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)}
            className="mt-1 h-4 w-4 accent-[#902632]" />
          I have saved my recovery key somewhere private.
        </label>
        {error && <p role="alert" className="mt-5 rounded-xl border border-[#e6b2a9] bg-[#fff1ee] px-4 py-3 text-sm text-[#912632]">{error}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          {onCancel && <button type="button" disabled={busy} onClick={cancel}
            className="min-w-0 flex-1 rounded-xl border border-[#cdb59c] px-4 py-3.5 text-sm font-bold text-[#704841] disabled:opacity-40">
            {busy ? 'Please wait…' : 'Cancel'}
          </button>}
          <button type="button" disabled={!acknowledged || busy} onClick={() => void run(onContinue)}
            className="min-w-0 flex-[2] rounded-xl bg-[#902632] px-4 py-3.5 text-sm font-bold text-white disabled:opacity-40">
            Continue to my parol →
          </button>
        </div>
      </section>
    </main>
  )
}
