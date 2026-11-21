import {useEffect, useRef, useState} from 'react'
import {createPortal} from 'react-dom'

type Props = {
  open: boolean
  preview: boolean
  messageCount: number
  onClose: () => void
  onOpenMessages: () => void
}

/**
 * Lightweight CSS-only Christmas celebration: no extra WebP/Remotion render,
 * media download, animation worker, or backend call.
 */
export default function ChristmasRevealDialog({
  open, preview, messageCount, onClose, onOpenMessages,
}: Props) {
  const [stage, setStage] = useState<0 | 1 | 2>(0)
  const dialogRef = useRef<HTMLDivElement>(null)
  const skipRef = useRef<HTMLButtonElement>(null)
  const unwrapRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    setStage(0)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) { setStage(2); return }
    const first = window.setTimeout(() => setStage(1), 750)
    const second = window.setTimeout(() => setStage(2), 2050)
    return () => { window.clearTimeout(first); window.clearTimeout(second) }
  }, [open])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement
    document.body.style.overflow = 'hidden'
    skipRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'Tab') {
        const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>(
          'button:not(:disabled)',
        )
        if (!buttons?.length) return
        const first = buttons[0]
        const last = buttons[buttons.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus()
    }
  }, [open, onClose])

  useEffect(() => {
    if (open && stage === 2) unwrapRef.current?.focus()
  }, [open, stage])

  if (!open) return null
  const hasLetters = messageCount > 0

  return createPortal(
    <div className="christmas-reveal-backdrop fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-[#081811]/95 p-3 text-[#fff0d4] sm:p-6">
      <div ref={dialogRef} role="dialog" aria-modal="true"
        aria-labelledby="christmas-reveal-title"
        aria-describedby="christmas-reveal-description"
        className="christmas-reveal-panel relative my-auto w-full max-w-lg overflow-hidden rounded-[30px] border border-[#d7ae64]/50 bg-[#10281f] px-5 py-8 text-center shadow-[0_20px_85px_rgba(0,0,0,.65)] sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <span className="christmas-sparkle absolute left-[12%] top-[14%]">✧</span>
          <span className="christmas-sparkle absolute right-[17%] top-[22%] [animation-delay:500ms]">✦</span>
          <span className="christmas-sparkle absolute left-[24%] top-[52%] [animation-delay:900ms]">✧</span>
          <span className="christmas-sparkle absolute right-[13%] top-[64%] [animation-delay:250ms]">✦</span>
          <span className="christmas-sparkle absolute left-[8%] bottom-[12%] [animation-delay:1200ms]">✧</span>
          <span className="christmas-sparkle absolute right-[28%] bottom-[10%] [animation-delay:700ms]">✧</span>
        </div>
        {preview && <div className="relative mb-3 inline-block rounded-full border border-[#e7bf82]/50 bg-[#563d2b]/70 px-4 py-1.5 text-[11px] font-bold tracking-wide text-[#ffe0ac]">
          ADMIN PREVIEW · This does not unlock real parols
        </div>}
        <div className="christmas-reveal-light relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-[#efc679]/55 bg-[#294a38] text-5xl text-[#ffe0a4]" aria-hidden="true">
          ✦
        </div>
        <p className="relative text-[11px] font-bold uppercase tracking-[.28em] text-[#eec88a]">
          Your Christmas story
        </p>
        <h2 id="christmas-reveal-title" className="relative mt-3 font-serif text-3xl leading-tight text-[#fff3d8] sm:text-4xl">
          Merry Christmas!
        </h2>
        <p id="christmas-reveal-description" className="relative mx-auto mt-3 max-w-sm text-sm leading-6 text-[#ead6b8]">
          The lights you collected have something special to share.
        </p>

        {stage >= 1 && <div className="christmas-reveal-count relative mt-6 rounded-2xl border border-[#d2af70]/25 bg-[#244333]/85 p-5">
          {hasLetters ? <>
            <p className="text-sm text-[#f3dfbd]">You received</p>
            <p className="mt-1 font-serif text-5xl font-semibold tabular-nums text-[#ffe1a0]">
              {messageCount}
            </p>
            <p className="mt-1 text-sm text-[#f3dfbd]">
              {messageCount === 1 ? 'Christmas message' : 'Christmas messages'} from your friends
            </p>
          </> : <>
            <p className="font-serif text-2xl text-[#ffe1a0]">Your parol is shining!</p>
            <p className="mt-2 text-sm text-[#f3dfbd]">
              No Christmas messages yet, but every light is part of your story.
            </p>
          </>}
        </div>}

        <div className="relative mt-6 space-y-3">
          {stage >= 2 ? <>
            <p className="text-sm text-[#e9d4ae]">
              {hasLetters ? 'Ready to unwrap the words behind your lights?' : 'Keep the Christmas glow going.'}
            </p>
            <button ref={unwrapRef} type="button" onClick={onOpenMessages}
              className="min-h-12 w-full rounded-xl bg-[#eacb8d] px-5 py-3 text-sm font-bold text-[#563323] shadow-lg hover:bg-[#ffdda0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffe5ad]">
              {hasLetters ? 'Unwrap my Christmas messages' : 'View my Christmas inbox'}
            </button>
          </> : <button ref={skipRef} type="button" onClick={() => setStage(2)}
            className="min-h-11 rounded-full border border-[#e3c28b]/45 px-5 py-2 text-sm font-semibold text-[#f3dfbd] hover:bg-white/10">
            Skip animation
          </button>}
          <button type="button" onClick={onClose}
            className="block min-h-11 w-full rounded-full px-5 py-2 text-xs font-semibold text-[#e1caa7] hover:text-white">
            Maybe later
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
