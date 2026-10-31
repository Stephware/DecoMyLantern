import { useState, type FormEvent } from 'react'
import { BannerAd, DesktopSideAds, NativeAd } from '../ads/AdPlacements'

type Props = {
  legacyAvailable: boolean
  onCreate: () => Promise<void>
  onRecover: (code: string) => Promise<void>
  onUpgradeLegacy: () => Promise<void>
}

export default function WelcomePage({
  legacyAvailable, onCreate, onRecover, onUpgradeLegacy,
}: Props) {
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
    <div className="relative min-h-screen bg-[#f7f2e9] text-[#27392e]">
      <DesktopSideAds />
      <header className="mx-auto flex max-w-[1300px] items-center justify-between gap-3 px-5 py-5 sm:px-9 min-[1700px]:max-w-[1200px]">
        <div className="flex items-center gap-2 font-serif text-2xl font-semibold">
          <span className="text-[#aa7d41]" aria-hidden="true">✦</span> BeMyParol
        </div>
        <span className="hidden rounded-full border border-[#dfd1bc] bg-white/75 px-4 py-2 text-xs text-[#77634c] sm:inline">
          Christmas, made together
        </span>
      </header>

      <main className="mx-auto grid max-w-[1300px] items-center gap-7 px-5 pb-14 pt-5 sm:px-9 lg:min-h-[calc(100dvh-90px)] lg:grid-cols-[1.2fr_.8fr] lg:gap-12 min-[1700px]:max-w-[1200px]">
        <section className="min-w-0">
          <div className="mb-5 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[.23em] text-[#a87b42]">Bawat ilaw, may kwento</p>
            <h1 className="mt-3 font-serif text-4xl font-semibold leading-[1.12] tracking-tight sm:text-6xl">
              A brighter <span className="text-[#902632]">Pasko</span>, together.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-7 text-[#71685a] sm:text-base">
              Create a Filipino parol that grows as friends add their lights. Collect private greetings and share the joy of Christmas.
            </p>
          </div>
          <div className="overflow-hidden rounded-[26px] border border-[#263e34] bg-[#15251e] p-3 shadow-[0_20px_55px_rgba(34,48,34,.18)] sm:p-5">
            <img src="/parol-classic-preview.svg" width={600} height={640}
              alt="BeMyParol Classic Gold Filipino festival parol"
              draggable={false} decoding="async"
              className="pointer-events-none mx-auto block h-auto w-full max-w-[710px] select-none" />
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-[28px] border border-[#e6d8c4] bg-[#fffdf8] p-6 shadow-[0_20px_45px_rgba(64,52,34,.08)] sm:p-9">
          <h2 className="mt-3 font-serif text-3xl font-semibold">
            {showRecovery ? 'Welcome back.' : 'Your parol starts here.'}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#73695b]">
            {showRecovery
              ? 'Enter your private recovery key to return to your parol.'
              : 'No account required. Keep your recovery key to come back.'}
          </p>
          {error && <p role="alert" className="mt-5 rounded-xl border border-[#e8b0ac] bg-[#fff0ee] px-4 py-3 text-sm text-[#922632]">{error}</p>}

          {showRecovery ? (
            <form onSubmit={recover} className="mt-6 space-y-4">
              <label htmlFor="recovery-key" className="block text-sm font-semibold text-[#3a493b]">
                Your private recovery key
              </label>
              <input id="recovery-key" type="text" required autoComplete="off"
                autoCapitalize="none" spellCheck={false} maxLength={128}
                value={code} onChange={event => setCode(event.target.value)}
                placeholder="Paste your recovery key"
                className="w-full rounded-xl border border-[#d8c8b2] bg-white px-4 py-3.5 text-sm text-[#27392e] placeholder:text-[#9d9284]" />
              <button type="submit" disabled={busy || !code.trim()}
                className="w-full rounded-xl bg-[#902632] px-5 py-3.5 text-sm font-bold text-white disabled:opacity-50">
                {busy ? 'Restoring…' : 'Restore my parol'}
              </button>
              <p className="text-xs leading-5 text-[#8b7d6c]">
                Your key is valid for one year. Recovering access ends your previous session.
              </p>
            </form>
          ) : (
            <button type="button" disabled={busy} onClick={() => void run(onCreate)}
              className="mt-7 w-full rounded-xl bg-[#902632] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#73202b] disabled:opacity-50">
              {busy ? 'Creating…' : 'Create my parol ✦'}
            </button>
          )}

          <button type="button" disabled={busy}
            onClick={() => {setShowRecovery(value=>!value);setError('');setCode('')}}
            className="mt-5 w-full py-2 text-sm font-semibold text-[#745a43] underline decoration-[#bfa887] underline-offset-4">
            {showRecovery ? 'Create a new parol instead' : 'Already have a parol? Recover it'}
          </button>
          {legacyAvailable && <div className="mt-5 border-t border-[#e8ddcf] pt-5">
            <p className="text-xs leading-5 text-[#7b7163]">An older Deco My Lantern session was found.</p>
            <button type="button" disabled={busy} onClick={() => void run(onUpgradeLegacy)}
              className="mt-3 w-full rounded-xl border border-[#bb9a73] px-4 py-3 text-sm font-semibold text-[#695035] disabled:opacity-50">
              Transfer my existing parol
            </button>
          </div>}
          <div className="mt-7 rounded-2xl bg-[#f4ebdc] p-4">
            <p className="text-sm font-semibold text-[#294334]">Your parol stays yours.</p>
            <p className="mt-1 text-xs leading-5 text-[#7c705f]">
              Save your private recovery key. Never share it with friends.
            </p>
          </div>
        </section>
      </main>
      <NativeAd />
      <div className="mt-10"><BannerAd /></div>
    </div>
  )
}
