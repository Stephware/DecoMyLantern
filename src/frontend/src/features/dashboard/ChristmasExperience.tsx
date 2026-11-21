import {useCallback, useEffect, useRef, useState} from 'react'
import {getLanternMessages, type ChristmasInbox} from '../../lib/api'
import ChristmasRevealDialog from './ChristmasRevealDialog'
import {canPreviewEarly, christmasRevealStorageKey, shouldAutoReveal} from './christmasRevealPolicy'

type Props = {
  lanternId: string
  seasonYear: number
  friendCount: number
  isAdmin: boolean
  /** Incremented solely by the existing admin-only testing lab. */
  adminPreviewSignal: number
}

const PAGE_SIZE = 12
const MAX_REFRESH_DELAY_MS = 6 * 60 * 60 * 1000

/**
 * The server owns the Christmas unlock, including a separate flag for real
 * December 25 versus admin early message access. No browser date override,
 * test query string, or public preview switch can read sealed letters.
 */
export default function ChristmasExperience({
  lanternId, seasonYear, friendCount, isAdmin, adminPreviewSignal,
}: Props) {
  const [response, setResponse] = useState<{lanternId: string; inbox: ChristmasInbox} | null>(null)
  const inbox = response?.lanternId === lanternId ? response.inbox : null
  const [refresh, setRefresh] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState(false)
  const [run, setRun] = useState(0)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const shownFor = useRef<string | null>(null)
  const handledAdminPreview = useRef(0)
  const inboxRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    void getLanternMessages(lanternId, controller.signal)
      .then(value => {
        if (!controller.signal.aborted) setResponse({lanternId, inbox: value})
      })
      .catch(caught => {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : 'Unable to load Christmas letters.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [lanternId, friendCount, refresh])

  useEffect(() => {
    setOpen(false)
    setVisibleCount(PAGE_SIZE)
    shownFor.current = null
    handledAdminPreview.current = 0
  }, [lanternId, seasonYear])

  // If a visitor keeps the page open through midnight, recheck the SERVER.
  // Clock changes only schedule another check; they can never unlock content.
  useEffect(() => {
    if (!inbox || inbox.christmasDayReached) return
    const until = Date.parse(inbox.unlockAtUtc) - Date.now()
    const delay = Number.isFinite(until)
      ? Math.min(until > 0 ? Math.max(until + 1500, 2_000) : 5 * 60_000,
        MAX_REFRESH_DELAY_MS)
      : MAX_REFRESH_DELAY_MS
    // Don't wake the hidden page just for polling; visibilitychange will
    // perform the server-authoritative check when the owner returns.
    const timer = window.setTimeout(() => {
      if (!document.hidden) setRefresh(n => n + 1)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [inbox])

  useEffect(() => {
    if (!inbox || inbox.christmasDayReached) return
    const onVisible = () => { if (!document.hidden) setRefresh(n => n + 1) }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [inbox])

  // One automatic celebration per saved parol and season in this browser.
  // The backend's true ChristmasDayReached flag prevents admin early access
  // from accidentally triggering production owners before December 25.
  useEffect(() => {
    if (!inbox) return
    const key = christmasRevealStorageKey(lanternId, seasonYear)
    if (shownFor.current === key) return
    let seen = false
    try { seen = localStorage.getItem(key) === 'seen' } catch { /* private browsing */ }
    if (!shouldAutoReveal(inbox, seen)) return
    shownFor.current = key
    try { localStorage.setItem(key, 'seen') } catch { /* show once in current mount */ }
    setPreview(false)
    setRun(n => n + 1)
    setOpen(true)
  }, [inbox, lanternId, seasonYear])

  // Manual early-access testing runs ONLY for the flagged admin owner and
  // uses the genuine saved letters from its own authorized inbox.
  useEffect(() => {
    if (!inbox || !canPreviewEarly(isAdmin, inbox) ||
        adminPreviewSignal === 0 || adminPreviewSignal === handledAdminPreview.current) return
    handledAdminPreview.current = adminPreviewSignal
    setPreview(!inbox.christmasDayReached)
    setRun(n => n + 1)
    setOpen(true)
  }, [adminPreviewSignal, inbox, isAdmin])

  const close = useCallback(() => setOpen(false), [])
  const openInbox = useCallback(() => {
    setOpen(false)
    window.setTimeout(() => {
      inboxRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      })
      inboxRef.current?.focus({preventScroll: true})
    }, 40)
  }, [])

  function replay() {
    if (!inbox?.unlocked || (!inbox.christmasDayReached && !isAdmin)) return
    setPreview(isAdmin && !inbox.christmasDayReached)
    setRun(n => n + 1)
    setOpen(true)
  }

  const messages = inbox?.messages ?? []
  const unlocked = inbox?.unlocked === true
  const earlyAdmin = isAdmin && unlocked && !inbox?.christmasDayReached

  return <>
    <section ref={inboxRef} tabIndex={-1} id="christmas-letters"
      aria-label="Christmas letters" className="scroll-mt-6 rounded-[24px] border border-[#e6dccc] bg-[#fffdf8] p-5 shadow-[0_10px_30px_rgba(57,43,27,.05)] outline-none sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#a4783e]">
            {earlyAdmin ? 'Admin early access' : 'A Christmas gift from your friends'}
          </p>
          <h3 className="mt-1 font-serif text-2xl text-[#283a30]">Christmas letters</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(isAdmin || unlocked) && <button type="button" disabled={loading}
            onClick={() => setRefresh(n => n + 1)}
            className="min-h-11 rounded-full border border-[#d5c6ae] px-4 py-2 text-xs font-semibold text-[#685744] disabled:opacity-50">
            Refresh letters
          </button>}
          {unlocked && <button type="button" onClick={replay}
            className="min-h-11 rounded-full border border-[#d5b78a] bg-[#fff6e7] px-4 py-2 text-xs font-bold text-[#7e3b35] hover:bg-[#ffe7c5]">
            {earlyAdmin ? 'Preview Christmas reveal' : 'Replay Christmas surprise'}
          </button>}
        </div>
      </div>

      {loading && !inbox && <p role="status" className="mt-4 text-sm text-[#766b5d]">
        Preparing your Christmas letters…
      </p>}
      {error && <div role="alert" className="mt-4 rounded-xl border border-[#e7b8ac] bg-[#fff0e9] p-3 text-sm text-[#8a3033]">
        <p>{error}</p>
        <button type="button" className="mt-2 min-h-10 font-bold underline"
          onClick={() => setRefresh(n => n + 1)}>Retry loading messages</button>
      </div>}

      {!error && inbox && !unlocked && <div className="mt-4 rounded-2xl border border-[#dbc49c] bg-[#f9f2e5] p-5 text-center">
        <span className="text-3xl text-[#a47b41]" aria-hidden="true">✉</span>
        <p className="mt-2 font-serif text-xl text-[#594735]">Sealed until Christmas Day</p>
        <p className="mt-2 text-sm leading-6 text-[#766a59]">
          Your friends' Christmas messages will open on December 25, Philippine time.
          Come back for your surprise.
        </p>
      </div>}

      {!error && inbox && unlocked && <>
        {earlyAdmin && <p className="mt-3 rounded-xl border border-[#d7bf91] bg-[#fff5dc] p-3 text-xs leading-5 text-[#765436]">
          Test parol only. You can read your own saved messages early, but ordinary owners stay locked until Christmas.
        </p>}
        <p className="mt-4 text-sm text-[#6b6457]">
          {messages.length === 0
            ? 'No messages yet. Your parol is still a wonderful Christmas memory.'
            : `${messages.length} ${messages.length === 1 ? 'letter' : 'letters'} waiting to be unwrapped.`}
        </p>
        {messages.length > 0 && <ul className="mt-4 space-y-3">
          {messages.slice(0, visibleCount).map(letter => <li key={letter.id}>
            <details className="group rounded-2xl border border-[#e2d2b9] bg-[#faf3e8] open:border-[#d1ac72] open:bg-[#fff7eb]">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-semibold text-[#443d34] marker:hidden">
                <span className="flex min-w-0 items-center gap-3">
                  <span aria-hidden="true" className="text-2xl text-[#b1804c] group-open:text-[#8b3c36]">✉</span>
                  <span className="min-w-0 break-words">{letter.displayName}</span>
                </span>
                <span className="shrink-0 text-xs text-[#8a7155] group-open:hidden">Unwrap +</span>
                <span className="hidden shrink-0 text-xs text-[#8a7155] group-open:inline">Close −</span>
              </summary>
              <div className="border-t border-[#e7d7bf] px-4 pb-5 pt-3">
                <time dateTime={letter.createdAtUtc} className="text-xs text-[#786b5e]">
                  {new Date(letter.createdAtUtc).toLocaleDateString('en-PH')}
                </time>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#354338]">
                  {letter.isLocked ? 'This message is still locked.' : letter.body}
                </p>
              </div>
            </details>
          </li>)}
        </ul>}
        {visibleCount < messages.length && <button type="button"
          className="mt-4 min-h-11 w-full rounded-xl border border-[#dbc6a7] px-4 py-3 text-sm font-bold text-[#7c4635]"
          onClick={() => setVisibleCount(n => n + PAGE_SIZE)}>
          Show more letters
        </button>}
      </>}
    </section>

    <ChristmasRevealDialog key={run} open={open && unlocked}
      preview={preview} messageCount={messages.length}
      onClose={close} onOpenMessages={openInbox}/>
  </>
}
