import { useEffect, useState } from 'react'
import LanternScene from '../lantern/renderer/LanternScene'
import { THEMES } from '../customization/themes'
import type { Design, Host, Lantern } from '../../lib/api'

type Props = {
  host: Host
  lantern: Lantern | null
  designs: Design[]
  onCreate: () => Promise<void>
  onSave: (designKey: string, patternKey: string) => Promise<void>
  onLogout: () => Promise<void>
}

const PATTERNS = [
  { key: 'default', label: 'Traditional', detail: 'Original star accents' },
  { key: 'rings', label: 'Celestial rings', detail: 'Soft circular detailing' },
  { key: 'rays', label: 'Radiant rays', detail: 'A brighter starburst' },
] as const

export default function HostDashboard({ host, lantern, designs, onCreate, onSave, onLogout }: Props) {
  const [draftDesign, setDraftDesign] = useState(lantern?.designKey ?? 'classic')
  const [draftPattern, setDraftPattern] = useState(lantern?.patternKey ?? 'default')
  const [busy, setBusy] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setDraftDesign(lantern?.designKey ?? 'classic')
    setDraftPattern(lantern?.patternKey ?? 'default')
  }, [lantern?.id, lantern?.designKey, lantern?.patternKey])

  const theme = THEMES.find(item => item.key === draftDesign) ?? THEMES[0]
  const accepted = lantern?.acceptedFriends ?? 0
  const changed = lantern !== null && (draftDesign !== lantern.designKey || draftPattern !== lantern.patternKey)

  async function run(action: () => Promise<void>, confirmation: string) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      setNotice(confirmation)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    setSigningOut(true)
    setError('')
    try {
      await onLogout()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to log out.')
      setSigningOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080e20] text-[#fff7e5]">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_35%_0%,#27395d_0%,transparent_55%),radial-gradient(ellipse_at_92%_85%,#392538_0%,transparent_45%)]" />
      <header className="relative border-b border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-2 text-sm font-bold tracking-wide sm:text-lg"><span className="text-2xl text-amber-300">✦</span> Deco My Lantern</div>
          <div className="flex items-center gap-4">
            <span className="hidden max-w-56 truncate text-xs text-white/50 sm:block">{host.email}</span>
            <button type="button" disabled={signingOut} onClick={signOut} className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/75 transition hover:border-amber-300/40 hover:text-white disabled:opacity-50">{signingOut ? 'Signing out…' : 'Log out'}</button>
          </div>
        </div>
      </header>
      <main className="relative mx-auto max-w-7xl px-5 pb-16 pt-9 sm:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-300/75">Your Christmas story</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold sm:text-5xl">My Lantern <span className="text-amber-300">{lantern?.seasonYear ?? new Date().getFullYear()}</span></h1>
            <p className="mt-3 text-sm text-white/55">A glow that grows with the people around you.</p>
          </div>
          <span className="rounded-full border border-amber-300/20 bg-amber-300/5 px-4 py-2 text-xs font-semibold text-amber-200">{lantern ? 'Your lantern is saved' : 'Your lantern awaits'}</span>
        </div>
        {(error || notice) && <div role={error ? 'alert' : 'status'} className={'mb-5 rounded-xl border px-4 py-3 text-sm ' + (error ? 'border-rose-400/35 bg-rose-400/10 text-rose-100' : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100')}>{error || notice}</div>}

        {!lantern ? (
          <div className="grid items-center gap-8 rounded-3xl border border-amber-300/15 bg-[#111b32]/80 p-6 shadow-xl lg:grid-cols-2 lg:p-12">
            <div className="max-w-md">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.26em] text-amber-300">First things first</p>
              <h2 className="font-serif text-3xl font-semibold sm:text-4xl">Every tradition begins with one light.</h2>
              <p className="mt-4 text-sm leading-7 text-white/65">Create your lantern to save its design and prepare it for the people you want to invite. You can customize its appearance afterward.</p>
              <button disabled={busy} onClick={() => void run(onCreate, 'Your lantern has been created!')} className="mt-7 rounded-xl bg-amber-300 px-6 py-3.5 text-sm font-bold text-slate-900 transition hover:bg-amber-200 disabled:opacity-50">{busy ? 'Creating…' : 'Create my lantern →'}</button>
              <p className="mt-4 text-xs text-white/40">One lantern per host per Christmas season.</p>
            </div>
            <div className="mx-auto w-full max-w-sm"><LanternScene friends={0} theme={THEMES[0]} /></div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_365px]">
            <section className="min-w-0 space-y-5">
              <div className="overflow-hidden rounded-3xl border border-amber-300/15 bg-[#101a30]/80 p-5 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/75">A parol of friendship</p>
                    <h2 className="mt-2 font-serif text-2xl sm:text-3xl">Your growing lantern</h2>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/65">Live database data</span>
                </div>
                <div className="mx-auto max-w-[620px]"><LanternScene friends={accepted} theme={theme} pattern={draftPattern} /></div>
                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-[#0b1325]/80 p-4 sm:grid-cols-3 sm:p-5">
                  <div><p className="text-2xl font-bold text-amber-200">{accepted}</p><p className="mt-1 text-xs text-white/50">Accepted lights</p></div>
                  <div><p className="text-lg font-semibold capitalize text-white">{lantern.growthStage}</p><p className="mt-1 text-xs text-white/50">Growth stage</p></div>
                  <div className="col-span-2 sm:col-span-1"><p className="text-lg font-semibold text-white">{lantern.nextMilestone === null ? 'Final stage' : lantern.nextMilestone - accepted + ' more'}</p><p className="mt-1 text-xs text-white/50">Until next milestone</p></div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#121e35]/75 p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <span className="rounded-xl bg-amber-300/10 p-3 text-2xl text-amber-200">✉</span>
                  <div>
                    <h3 className="font-serif text-xl">Christmas Letters</h3>
                    <p className="mt-2 text-sm leading-6 text-white/60">Letters stay private to you and sealed until December 25 at 12:00 AM Philippine time. The full inbox experience is planned for Phase 4.</p>
                  </div>
                </div>
              </div>
            </section>
            <aside className="space-y-5">
              <section className="rounded-3xl border border-white/10 bg-[#14213a]/90 p-5 shadow-xl sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300/75">Personalize</p>
                <h2 className="mt-2 font-serif text-2xl">Make it yours</h2>
                <p className="mb-6 mt-2 text-sm leading-6 text-white/55">Preview designs and patterns, then save your selection to your account.</p>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-white/60">Design & color palette</h3>
                <div className="space-y-3">
                  {designs.map(design => {
                    const palette = THEMES.find(item => item.key === design.designKey)
                    const locked = accepted < design.requiredFriends
                    return <button key={design.designKey} type="button" disabled={locked || busy} onClick={() => { setDraftDesign(design.designKey); setNotice('') }} aria-pressed={draftDesign === design.designKey} className={'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ' + (draftDesign === design.designKey ? 'border-amber-300 bg-amber-300/10' : 'border-white/10 bg-white/5') + (locked ? ' cursor-not-allowed opacity-45' : ' hover:border-amber-200/60')}>
                      <span className="flex shrink-0 gap-0.5">{palette?.colors.map((color, index) => <span key={index} className="h-8 w-2.5 rounded-sm" style={{ backgroundColor: color }} />)}</span>
                      <span className="flex-1 text-sm font-semibold">{design.name}</span>
                      <span className="text-xs text-amber-200/80">{locked ? design.requiredFriends + ' lights' : draftDesign === design.designKey ? 'Selected' : 'Choose'}</span>
                    </button>
                  })}
                  {designs.length === 0 && <p className="text-sm text-rose-200">Designs could not be loaded. Refresh the page before saving.</p>}
                </div>
                <h3 className="mb-3 mt-7 text-xs font-bold uppercase tracking-[0.18em] text-white/60">Decorative pattern</h3>
                <div className="space-y-2">
                  {PATTERNS.map(option => <button key={option.key} type="button" disabled={busy} onClick={() => { setDraftPattern(option.key); setNotice('') }} aria-pressed={draftPattern === option.key} className={'flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition ' + (draftPattern === option.key ? 'border-amber-300 bg-amber-300/10' : 'border-white/10 bg-white/5 hover:border-white/30')}>
                    <span><span className="block text-sm font-semibold">{option.label}</span><span className="mt-0.5 block text-xs text-white/45">{option.detail}</span></span>
                    <span aria-hidden="true" className="text-amber-300">{draftPattern === option.key ? '●' : '○'}</span>
                  </button>)}
                </div>
                <button type="button" disabled={!changed || busy || designs.length === 0} onClick={() => void run(() => onSave(draftDesign, draftPattern), 'Your lantern customization has been saved.')} className="mt-6 w-full rounded-xl bg-amber-300 px-5 py-3.5 text-sm font-bold text-slate-900 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40">{busy ? 'Saving…' : changed ? 'Save customization →' : 'All changes saved'}</button>
              </section>
              <section className="rounded-2xl border border-dashed border-amber-200/25 bg-amber-300/5 p-5">
                <p className="text-sm font-bold text-amber-100">Invite your friends</p>
                <p className="mt-2 text-sm leading-6 text-white/55">Sharing links and anonymous guest contributions are part of Phase 3. Your lantern is ready for that feature.</p>
                <button type="button" disabled className="mt-4 w-full cursor-not-allowed rounded-lg border border-amber-200/20 px-4 py-3 text-xs font-semibold text-amber-100/55">Share link · Coming soon</button>
              </section>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}
