import { useEffect, useRef, type TouchEvent } from 'react'
import type { Design } from '../../lib/api'
import DesignShowcaseGallery from './DesignShowcaseGallery'

export const PATTERNS = [
  { key:'default', label:'Traditional' },
  { key:'rings', label:'Filigree trim' },
  { key:'rays', label:'Radiant rays' },
] as const

type Picker = {
  firstTime: boolean
  designs: readonly Design[]
  selected: string
  onSelect: (key: string) => void
  busy: boolean
  error: string
  onSave: () => void
  onLater: () => void
}

export function FirstTimeDesignPicker({
  firstTime, designs, selected, onSelect, busy, error, onSave, onLater,
}: Picker) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    heading.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onLater() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = old
      document.removeEventListener('keydown', onKey)
    }
  }, [busy, onLater])

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#102019]/75 p-3 backdrop-blur-md sm:p-6">
      <section role="dialog" aria-modal="true" aria-labelledby="first-design-title"
        className="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-[#f9f5ed] text-[#24362e] shadow-2xl">
        <header className="border-b border-[#e5d9c7] px-5 py-4 sm:px-8 sm:py-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.23em] text-[#9a5c30]">Welcome to your Christmas parol</p>
          <h2 ref={heading} tabIndex={-1} id="first-design-title" className="mt-2 font-serif text-2xl font-semibold outline-none sm:text-4xl">
            {firstTime ? 'Choose the parol you’ll grow together.' : 'Find your next favorite parol.'}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#756b5f]">
            Explore all six designs in their most festive 50-friend form. Your real parol grows only
            when friends join, and you can change styles anytime.
          </p>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8">
          <DesignShowcaseGallery designs={designs} selected={selected} onChoose={onSelect}
            enabled disabled={busy} />
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e5d9c7] bg-[#fffaf2] px-5 py-4 sm:px-8">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#273d32]">Selected: {designs.find(d => d.designKey === selected)?.name ?? 'Classic Gold'}</p>
            <p className="text-xs text-[#7c7164]">You can change designs later—no friend progress is lost.</p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <button type="button" disabled={busy} onClick={onLater}
              className="flex-1 rounded-xl border border-[#d4c1a9] px-4 py-3 text-sm font-semibold text-[#4c443a] disabled:opacity-50 sm:flex-none">
              {firstTime ? 'Decide later' : 'Cancel'}
            </button>
            <button type="button" disabled={busy || designs.length === 0} onClick={onSave}
              className="flex-1 rounded-xl bg-[#922632] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#76202a] disabled:opacity-50 sm:flex-none">
              {busy ? 'Saving…' : firstTime ? 'Choose this parol' : 'Apply my selection'}
            </button>
          </div>
          {error && <p role="alert" className="w-full text-sm text-[#9f2432]">{error}</p>}
        </footer>
      </section>
    </div>
  )
}

type SheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  designs: readonly Design[]
  selected: string
  onSelect: (key: string) => void
  pattern: string
  onPattern: (key: string) => void
  changed: boolean
  busy: boolean
  error: string
  onSave: () => void
}

export function MobileDesignDrawer({
  open, onOpenChange, designs, selected, onSelect, pattern, onPattern,
  changed, busy, error, onSave,
}: SheetProps) {
  const startY = useRef<number | null>(null)
  const swiped = useRef(false)
  const onStart = (event: TouchEvent<HTMLButtonElement>) => {
    startY.current = event.changedTouches[0]?.clientY ?? null
    swiped.current = false
  }
  const onEnd = (event: TouchEvent<HTMLButtonElement>) => {
    const end = event.changedTouches[0]?.clientY
    if (startY.current === null || end === undefined) return
    const movement = end - startY.current
    if (movement < -35) { swiped.current = true; onOpenChange(true) }
    else if (movement > 35) { swiped.current = true; onOpenChange(false) }
    startY.current = null
  }
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onOpenChange(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  return (
    <div className="lg:hidden">
      {open && <button type="button" aria-label="Close design choices"
        className="fixed inset-0 z-[69] bg-[#17241b]/60 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)} />}
      <section aria-label="Parol design choices"
        className={`fixed inset-x-0 bottom-0 z-[70] mx-auto w-full max-w-2xl rounded-t-[28px] border border-[#decbb0] bg-[#faf5eb] shadow-[0_-15px_45px_rgba(18,33,27,.25)] transition-transform duration-300 ${open
          ? 'max-h-[84dvh] overflow-y-auto'
          : 'overflow-hidden'}`}
        style={{paddingBottom:'env(safe-area-inset-bottom)'}}>
        <button type="button" onClick={() => {
            // Suppress the synthetic click generated after a vertical swipe.
            if (swiped.current) { swiped.current = false; return }
            onOpenChange(!open)
          }}
          onTouchStart={onStart} onTouchEnd={onEnd} aria-expanded={open}
          aria-controls="mobile-design-choices"
          className="flex w-full touch-pan-x flex-col items-center px-5 pb-3 pt-2 text-[#263c30]">
          <span aria-hidden="true" className="mb-2 h-1.5 w-12 rounded-full bg-[#b6ab98]" />
          <span className="flex w-full items-center justify-between gap-3">
            <span className="min-w-0 text-left">
              <span className="block text-[11px] font-bold uppercase tracking-widest text-[#947341]">Customize your parol</span>
              <span className="block truncate font-serif text-lg font-semibold">
                {designs.find(d => d.designKey === selected)?.name ?? 'Choose a design'}
              </span>
            </span>
            <span className="rounded-full bg-[#eee2d1] px-3 py-2 text-sm font-bold" aria-hidden="true">
              {open ? '↓ Close' : '↑ Designs'}
            </span>
          </span>
        </button>
        {open && <div id="mobile-design-choices" className="px-4 pb-5">
          <p className="mb-3 text-xs text-[#756a5c]">
            Swipe the handle down to close. Choose how your parol could look with 50 friends.
          </p>
          <DesignShowcaseGallery designs={designs} selected={selected} onChoose={onSelect}
            enabled={open} disabled={busy} />
          <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-widest text-[#6f5d49]">Decorative pattern</p>
          <div className="flex flex-wrap gap-2">
            {PATTERNS.map(option => <button key={option.key} type="button" disabled={busy}
              aria-pressed={pattern === option.key} onClick={() => onPattern(option.key)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold ${pattern === option.key
                ? 'border-[#8c262e] bg-[#8c262e] text-white'
                : 'border-[#d7c6ae] bg-white text-[#4b493c]'}`}>
              {option.label}
            </button>)}
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-[#9c2630]">{error}</p>}
          <button type="button" disabled={!changed || busy || designs.length === 0} onClick={onSave}
            className="mt-5 w-full rounded-xl bg-[#922632] px-5 py-3.5 text-sm font-bold text-white disabled:opacity-45">
            {busy ? 'Saving…' : changed ? 'Save my design' : 'Current design saved'}
          </button>
        </div>}
      </section>
    </div>
  )
}
