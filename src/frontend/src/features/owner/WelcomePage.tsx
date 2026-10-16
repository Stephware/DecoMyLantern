import { useState, type FormEvent } from 'react'
import LanternScene from '../lantern/renderer/LanternScene'
import { THEMES } from '../customization/themes'

type Props = {
  legacyAvailable: boolean
  onCreate: () => Promise<void>
  onRecover: (code: string) => Promise<void>
  onUpgradeLegacy: () => Promise<void>
}

export default function WelcomePage({ legacyAvailable, onCreate, onRecover, onUpgradeLegacy }: Props) {
  const [showRecovery, setShowRecovery] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try { await action() }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Please try again.') }
    finally { setBusy(false) }
  }

  function recover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void run(() => onRecover(code.trim()))
  }

  return (
    <div className="min-h-screen bg-[#080e20] text-[#fff7e5]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_25%_14%,#27385d_0%,transparent_46%),radial-gradient(ellipse_at_88%_80%,#442c37_0%,transparent_42%)]" aria-hidden="true" />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-2.5 text-base font-bold tracking-wide"><span className="text-2xl text-amber-300">✦</span> BeMyParol</div>
        <span className="rounded-full border border-amber-200/20 bg-amber-100/5 px-3 py-1.5 text-xs text-amber-100/70">Christmas, made together</span>
      </header>
      <main className="relative mx-auto grid max-w-6xl items-center gap-8 px-5 pb-16 pt-8 sm:px-8 lg:min-h-[calc(100vh-85px)] lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <section className="min-w-0 text-center lg:text-left">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.32em] text-amber-300/80">Bawat ilaw, may kwento</p>
          <h1 className="mx-auto max-w-xl font-serif text-4xl font-semibold leading-[1.13] tracking-tight sm:text-6xl lg:mx-0">Let your friends <span className="text-amber-300">light up your Pasko.</span></h1>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-white/65 sm:text-base lg:mx-0">
            Create a Filipino Christmas parol. Friends will soon be able to add a light and a message that stays sealed until Christmas Day.
          </p>
          <div className="mx-auto mt-4 max-w-[400px] lg:mx-0"><LanternScene previewCount={5} theme={THEMES[0]} /></div>
          <p className="text-xs text-white/40">Sample parol · Invitations are coming in Task 4</p>
        </section>
        <section className="mx-auto w-full max-w-md rounded-[30px] border border-white/10 bg-[#131e35]/95 p-6 shadow-2xl shadow-black/20 sm:p-9">
          <h2 className="font-serif text-3xl font-semibold">{showRecovery ? 'Restore your parol' : 'Your parol starts here'}</h2>
          <p className="mt-3 text-sm leading-6 text-white/60">
            {showRecovery ? 'Paste the private recovery key you saved when you created your parol.' : 'No sign-up, email, or password needed. We’ll securely remember your parol in this browser.'}
          </p>
          {error && <p role="alert" className="mt-5 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</p>}
          {showRecovery ? (
            <form onSubmit={recover} className="mt-7 space-y-4">
              <label htmlFor="recovery-key" className="block text-sm font-semibold text-amber-100">Your private recovery key</label>
              <input id="recovery-key" type="text" required autoComplete="off" autoCapitalize="none" spellCheck={false}
                maxLength={128} value={code} onChange={event => setCode(event.target.value)}
                placeholder="Paste your recovery key" className="w-full rounded-xl border border-white/15 bg-[#090f20] px-4 py-3.5 text-sm text-white placeholder:text-white/30" />
              <button type="submit" disabled={busy || !code.trim()} className="w-full rounded-xl bg-amber-300 px-5 py-3.5 text-sm font-bold text-slate-900 disabled:opacity-50">
                {busy ? 'Restoring…' : 'Restore my parol'}
              </button>
              <p className="text-xs leading-5 text-white/45">Restoring this parol will invalidate its old browser access and recovery key. Save the new recovery key shown next.</p>
            </form>
          ) : (
            <button type="button" disabled={busy} onClick={() => void run(onCreate)}
              className="mt-7 w-full rounded-xl bg-amber-300 px-5 py-3.5 text-sm font-bold text-slate-900 transition hover:bg-amber-200 disabled:opacity-50">
              {busy ? 'Creating…' : 'Create my parol →'}
            </button>
          )}
          <button type="button" disabled={busy} onClick={() => { setShowRecovery(value => !value); setError(''); setCode('') }}
            className="mt-5 w-full py-2 text-sm font-medium text-amber-100/80 underline decoration-white/30 underline-offset-4">
            {showRecovery ? 'Create a new parol instead' : 'Already have a parol? Use a recovery key'}
          </button>
          {legacyAvailable && (
            <div className="mt-5 border-t border-white/10 pt-5">
              <p className="text-xs leading-5 text-white/55">We found an existing Deco My Lantern session in this browser.</p>
              <button type="button" disabled={busy} onClick={() => void run(onUpgradeLegacy)}
                className="mt-3 w-full rounded-xl border border-amber-300/40 px-4 py-3 text-sm font-semibold text-amber-100 disabled:opacity-50">
                Transfer my existing parol
              </button>
            </div>
          )}
          <p className="mt-6 text-center text-xs leading-5 text-white/40">You’ll receive a private recovery key to save for another device or if browser data is cleared.</p>
        </section>
      </main>
    </div>
  )
}
