import { useEffect, useRef, useState, type FormEvent } from 'react'
import { BannerAd, DesktopSideAds, NativeAd } from '../ads/AdPlacements'
import { THEMES, type Theme } from '../customization/themes'

type Props = {
  legacyAvailable: boolean
  onCreate: (designKey: string) => Promise<void>
  onRecover: (code: string) => Promise<void>
  onUpgradeLegacy: () => Promise<void>
}

const STEPS = [
  ['Pick a parol', 'Choose the design that feels like your Pasko.'],
  ['Share your link', 'Send it to friends and family. No account needed.'],
  ['Watch it grow', 'Every friend adds a light and a private greeting.'],
] as const

export default function WelcomePage({
  legacyAvailable, onCreate, onRecover, onUpgradeLegacy,
}: Props) {
  const [selected, setSelected] = useState<Theme | null>(null)
  const [showRecovery, setShowRecovery] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const marqueeRef = useRef<HTMLDivElement>(null)

  // Open after render so showModal focuses the dialog's Create button.
  useEffect(() => { if (selected) dialogRef.current?.showModal() }, [selected])

  // Auto-advance a real scroller (never paused by hover). Any user scroll, swipe, drag or press holds it
  // briefly, so a tap lands on the parol under the finger and that design is the one recorded.
  // The list is there twice, so jumping by half a track is invisible: it wraps in both directions,
  // whoever is moving it, and starts half a track in so there is content to the left too.
  // shortcut: the loop needs the viewport narrower than one list (~2500px); add a third copy for wider screens.
  useEffect(() => {
    const el = marqueeRef.current
    if (!el) return
    const HOLD_MS = 500
    const loopSeconds = matchMedia('(prefers-reduced-motion: reduce)').matches ? 70 : 28
    el.scrollLeft = el.scrollWidth / 2
    let pos = el.scrollLeft, last = performance.now(), holdUntil = 0, frame = 0
    let pressed = false, suppressClick = false
    let drag: { x: number, left: number, moved: boolean } | null = null

    const tick = (now: number) => {
      const dt = Math.min(now - last, 250) / 1000 // cap: no leap after returning to the tab
      last = now
      const half = el.scrollWidth / 2
      const margin = Math.max(0, (half - el.clientWidth) / 2) // keeps both jump targets inside the scroll range
      // Moved by someone else (swipe, trackpad, keyboard focus, drag): follow it and hold.
      if (Math.abs(el.scrollLeft - pos) > 2) { pos = el.scrollLeft; holdUntil = now + HOLD_MS }
      const paused = el.dataset.paused === 'true' || el.querySelector(':focus-visible') !== null
      let moved = false
      if (!pressed && !paused && now > holdUntil) { pos += half / loopSeconds * dt; moved = true }
      const shift = pos < margin ? half : pos > half + margin ? -half : 0
      if (shift) { pos += shift; moved = true; if (drag) drag.left += shift }
      if (moved) el.scrollLeft = pos
      frame = requestAnimationFrame(tick)
    }
    const down = (event: PointerEvent) => {
      pressed = true
      suppressClick = false
      // Touch and pen scroll natively; a mouse needs drag-to-scroll.
      if (event.pointerType === 'mouse' && event.button === 0) drag = { x: event.clientX, left: el.scrollLeft, moved: false }
    }
    const move = (event: PointerEvent) => {
      if (!drag) return
      const dx = event.clientX - drag.x
      if (Math.abs(dx) > 5) drag.moved = true
      if (drag.moved) el.scrollLeft = drag.left - dx
    }
    const up = () => {
      if (!pressed) return
      suppressClick = drag?.moved ?? false
      pressed = false
      drag = null
      holdUntil = performance.now() + HOLD_MS
    }
    // A drag must not also open the popup for the card it ended on.
    const click = (event: MouseEvent) => {
      if (!suppressClick) return
      event.preventDefault()
      event.stopPropagation()
      suppressClick = false
    }

    frame = requestAnimationFrame(tick)
    el.addEventListener('pointerdown', down)
    el.addEventListener('click', click, true)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('click', click, true)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [])

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

  // Static files only: the landing page must never call the parol renderer.
  // Card width 40svh keeps the whole parol plus the recover link on a 360x640 phone with browser bars;
  // 70vw lets the next parol peek in so it reads as scrollable.
  // No lazy loading: cards start off-screen in an overflow-hidden, transform-animated track,
  // where lazy images never get fetched; all six are needed anyway (~940 KB total, cached).
  const parolCards = (copy: boolean) => THEMES.map(theme => (
    <li key={theme.key} className="px-2 sm:px-3">
      <button type="button" tabIndex={copy ? -1 : undefined} aria-haspopup="dialog"
        onClick={() => { setSelected(theme); setShowRecovery(false); setError('') }}
        className="group block w-[clamp(190px,min(40svh,70vw),400px)] rounded-[22px] p-2 text-center transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-[#f8cc6f]">
        <img src={`/parols/${theme.key}.webp`} width={800} height={853} alt={copy ? '' : `${theme.label} parol`}
          decoding="async" draggable={false}
          className="pointer-events-none mx-auto h-auto w-full select-none transition duration-300 group-hover:scale-105" />
        <span className="mt-1 block text-sm font-semibold text-[#efe6d4]">{theme.label}</span>
      </button>
    </li>
  ))

  return (
    <div className="relative min-h-screen bg-[#f7f2e9] text-[#27392e]">
      <DesktopSideAds />
      <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex max-w-[1200px] items-center justify-center px-5 pt-6 sm:px-9">
        <div className="flex items-center gap-2 font-serif text-3xl font-semibold">
          <img src="/bemyparol-logo.png" alt="" aria-hidden="true" width={48} height={48} draggable={false}
            className="h-12 w-12 shrink-0 object-contain" /> BeMyParol
        </div>
      </header>

      <main className="flex flex-1 flex-col justify-center pb-8">
        <section className="mx-auto max-w-2xl px-5 pt-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[.23em] text-[#a87b42]">Bawat ilaw, may kwento</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Select your <span className="text-[#902632]">parol</span>
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#71685a] sm:text-base">Tap the one you love to start.</p>
        </section>

        <section aria-label="Parol designs" className="mt-4 bg-[#15251e] py-5 sm:py-8">
          <div ref={marqueeRef} className="parol-marquee" data-paused={selected !== null}>
            <div className="parol-marquee-track">
              <ul className="flex">{parolCards(false)}</ul>
              <ul className="parol-marquee-copy flex" aria-hidden="true">{parolCards(true)}</ul>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-2 w-full max-w-md px-5 text-center">
          {error && !selected && <p role="alert" className="mb-4 rounded-xl border border-[#e8b0ac] bg-[#fff0ee] px-4 py-3 text-left text-sm text-[#922632]">{error}</p>}
          {showRecovery && (
            <form onSubmit={recover} className="mb-2 space-y-4 rounded-[28px] border border-[#e6d8c4] bg-[#fffdf8] p-6 text-left shadow-[0_20px_45px_rgba(64,52,34,.08)] sm:p-8">
              <h2 className="font-serif text-2xl font-semibold">Welcome back.</h2>
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
          )}
          <button type="button" disabled={busy}
            onClick={() => {setShowRecovery(value=>!value);setError('');setCode('')}}
            className="py-2 text-sm font-semibold text-[#745a43] underline decoration-[#bfa887] underline-offset-4">
            {showRecovery ? 'Cancel' : 'Already have a parol? Recover it'}
          </button>
          {legacyAvailable && <div className="mt-5 border-t border-[#e8ddcf] pt-5">
            <p className="text-xs leading-5 text-[#7b7163]">An older Deco My Lantern session was found.</p>
            <button type="button" disabled={busy} onClick={() => void run(onUpgradeLegacy)}
              className="mt-3 w-full rounded-xl border border-[#bb9a73] px-4 py-3 text-sm font-semibold text-[#695035] disabled:opacity-50">
              Transfer my existing parol
            </button>
          </div>}
        </section>
      </main>
      </div>

      <section className="mx-auto max-w-[1000px] px-5 py-14 text-center">
        <h2 className="font-serif text-3xl font-semibold sm:text-4xl">
          Create a growing parol to share with your friends
        </h2>
        <ol className="mt-8 grid gap-4 text-left sm:grid-cols-3">
          {STEPS.map(([title, body], index) => (
            <li key={title} className="rounded-2xl bg-[#f4ebdc] p-5">
              <p className="font-serif text-2xl text-[#a87b42]" aria-hidden="true">{index + 1}</p>
              <p className="mt-1 font-semibold text-[#294334]">{title}</p>
              <p className="mt-1 text-sm leading-6 text-[#7c705f]">{body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-xs leading-5 text-[#8b7d6c]">
          Your parol stays yours. Save your private recovery key and never share it with friends.
        </p>
      </section>

      {/* A confirm tap: owner creation is rate limited and a moving marquee is easy to mis-tap. */}
      <dialog ref={dialogRef} aria-labelledby="create-parol-title"
        onCancel={event => { if (busy) event.preventDefault() }}
        onClose={() => { setSelected(null); setError('') }}
        onClick={event => { if (event.target === event.currentTarget && !busy) dialogRef.current?.close() }}
        className="m-auto w-[min(92vw,380px)] rounded-[28px] bg-[#fffdf8] p-0 text-[#27392e] shadow-[0_24px_70px_rgba(0,0,0,.45)] backdrop:bg-[#081811]/75">
        {selected && <div className="p-6 text-center sm:p-8">
          <img src={`/parols/${selected.key}.webp`} width={800} height={853} alt="" draggable={false}
            className="mx-auto h-auto w-40 select-none sm:w-48" />
          <h2 id="create-parol-title" className="mt-2 font-serif text-2xl font-semibold">{selected.label}</h2>
          <p className="mt-1 text-sm leading-6 text-[#73695b]">No account required. Keep your recovery key to come back.</p>
          {error && <p role="alert" className="mt-4 rounded-xl border border-[#e8b0ac] bg-[#fff0ee] px-4 py-3 text-left text-sm text-[#922632]">{error}</p>}
          <button type="button" disabled={busy} onClick={() => void run(() => onCreate(selected.key))}
            className="mt-5 w-full rounded-xl bg-[#902632] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#73202b] disabled:opacity-50">
            {busy ? 'Creating…' : `Create my ${selected.label} parol ✦`}
          </button>
          <button type="button" disabled={busy} onClick={() => dialogRef.current?.close()}
            className="mt-2 w-full py-2 text-sm font-semibold text-[#745a43] disabled:opacity-50">
            Choose another
          </button>
        </div>}
      </dialog>
      <NativeAd />
      <div className="mt-10"><BannerAd /></div>
    </div>
  )
}
