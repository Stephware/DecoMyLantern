import { useEffect, useState } from 'react'
import LanternScene from '../lantern/renderer/LanternScene'
import ParolArtwork from '../lantern/renderer/ParolArtwork'
import ProceduralOuterShell from '../lantern/renderer/ProceduralOuterShell'
import { MAX_TEST_FRIENDS, stageForFriends, nextDesignMilestone } from '../lantern/growth/stages'
import { THEMES } from '../customization/themes'
import InvitationManager from '../invitations/InvitationManager'
import type { Design, Lantern } from '../../lib/api'

type Props = {
  lantern: Lantern | null
  designs: Design[]
  onCreate: () => Promise<void>
  onSave: (designKey: string, patternKey: string) => Promise<void>
  onRegenerateRecovery: () => Promise<void>
  onLogout: () => Promise<void>
}

const PATTERNS = [
  { key: 'default', label: 'Traditional', detail: 'Original star accents' },
  { key: 'rings', label: 'Filigree trim', detail: 'Delicate foil and bead detailing' },
  { key: 'rays', label: 'Radiant rays', detail: 'A brighter starburst' },
] as const

export default function HostDashboard({ lantern, designs, onCreate, onSave, onRegenerateRecovery, onLogout }: Props) {
  const [draftDesign, setDraftDesign] = useState(lantern?.designKey ?? 'classic')
  const [draftPattern, setDraftPattern] = useState(lantern?.patternKey ?? 'default')
  const [busy, setBusy] = useState(false)
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    setDraftDesign(lantern?.designKey ?? 'classic')
    setDraftPattern(lantern?.patternKey ?? 'default')
  }, [lantern?.id, lantern?.designKey, lantern?.patternKey])

  const theme = THEMES.find(item => item.key === draftDesign) ?? THEMES[0]
  const accepted = lantern?.acceptedFriends ?? 0
  const unlockProgress = Math.max(accepted, lantern?.maxReachedFriends ?? accepted)
  const nextDesign = nextDesignMilestone(unlockProgress)
  const changed = lantern !== null && (draftDesign !== lantern.designKey || draftPattern !== lantern.patternKey)
  const selectedDesign = designs.find(item => item.designKey === draftDesign)
  const invalidDesign = selectedDesign === undefined || (selectedDesign.requiredFriends > unlockProgress && lantern?.designKey !== draftDesign)

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
    if (!window.confirm('Before leaving, make sure you saved your recovery key. You will need it to return to this parol. Continue?')) return
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
          <div className="flex items-center gap-2 text-sm font-bold tracking-wide sm:text-lg"><span className="text-2xl text-amber-300">✦</span> BeMyParol</div>
          <div className="flex items-center gap-4">
            <button type="button" disabled={busy || signingOut} onClick={() => {
              if (window.confirm('Generate a new recovery key? Your previous recovery key will immediately stop working.'))
                void run(onRegenerateRecovery, 'New recovery key generated.')
            }} className="rounded-full border border-amber-300/25 px-4 py-2 text-xs font-semibold text-amber-100 transition hover:border-amber-300/50 disabled:opacity-50">Recovery key</button>
            <button type="button" disabled={signingOut || busy} onClick={signOut} className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/75 transition hover:border-amber-300/40 hover:text-white disabled:opacity-50">{signingOut ? 'Leaving…' : 'Leave parol'}</button>
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
            <div className="mx-auto w-full max-w-sm"><LanternScene previewCount={0} theme={THEMES[0]} /></div>
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
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/65">{previewCount === null ? 'Your evolving parol' : 'Design lab · Test friends only'}</span>
                </div>
                <div className="mx-auto max-w-[620px]"><LanternScene theme={theme} pattern={draftPattern} contributions={previewCount === null ? lantern.lights : []} previewCount={previewCount === null ? undefined : previewCount} /></div>
                <div className="mt-2 space-y-3" aria-label="Simulate a friend joining without saving">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button type="button" onClick={() => setPreviewCount(null)} aria-pressed={previewCount === null}
                      className={'rounded-full border px-3 py-2 text-xs font-semibold transition ' + (previewCount === null ? 'border-amber-300 bg-amber-300/15 text-amber-100' : 'border-white/10 text-white/55 hover:border-white/25')}>
                      My real parol
                    </button>
                    <button type="button" disabled={previewCount === 0} onClick={() => setPreviewCount(Math.max(0, (previewCount ?? accepted) - 1))}
                      className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/85 hover:border-amber-300/60 disabled:opacity-30">
                      −1 friend
                    </button>
                    <button type="button" disabled={previewCount !== null && previewCount >= MAX_TEST_FRIENDS}
                      onClick={() => setPreviewCount(Math.min(MAX_TEST_FRIENDS, (previewCount ?? accepted) + 1))}
                      className="rounded-xl bg-amber-300 px-4 py-2 text-xs font-bold text-[#142033] hover:bg-amber-200 disabled:opacity-30">
                      + Add test friend
                    </button>
                    <button type="button" onClick={() => setPreviewCount(0)}
                      className="rounded-xl border border-white/15 px-3 py-2 text-xs text-white/70 hover:border-white/35">
                      Reset to 0
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2" aria-label="Jump to design unlock milestones">
                    { [0, 3, 10, 23, 40, 50].map(count => (
                      <button key={count} type="button" onClick={() => setPreviewCount(count)}
                        aria-pressed={previewCount === count}
                        className={'rounded-full border px-3 py-1.5 text-xs transition ' +
                          (previewCount === count ? 'border-amber-300 bg-amber-300/15 text-amber-100' : 'border-white/10 text-white/55 hover:border-white/30')}>
                        {count} friends
                      </button>
                    ))}
                  </div>
                  {previewCount !== null && (
                    <p role="status" className="text-center text-xs font-semibold text-amber-200">
                      {previewCount} simulated friends · {stageForFriends(previewCount).name} design milestone · No data saved
                    </p>
                  )}
                </div>
                <p className="mt-3 text-center text-xs leading-5 text-white/40">{previewCount === null ? 'Every friend adds five glowing glass inlays across the ornament. Flower panels, foil latticework, edge filigree and the outer silhouette evolve while their individual star light stays identifiable.' : 'Design preview only: new capiz-style details appear as you add friends. This does not save contributions, send invitations, or unlock designs.'}</p>
                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-[#0b1325]/80 p-4 sm:grid-cols-3 sm:p-5">
                  <div><p className="text-2xl font-bold text-amber-200">{accepted}</p><p className="mt-1 text-xs text-white/50">Accepted friends</p></div>
                  <div><p className="text-lg font-semibold text-white">{stageForFriends(unlockProgress).name}</p><p className="mt-1 text-xs text-white/50">Highest unlocked design</p></div>
                  <div className="col-span-2 sm:col-span-1"><p className="text-lg font-semibold text-white">{nextDesign ? `${nextDesign.minFriends} friends` : 'All designs unlocked'}</p><p className="mt-1 text-xs text-white/50">{nextDesign ? 'Next design milestone' : 'Outer artwork still keeps evolving'}</p></div>
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
                <p className="mb-6 mt-2 text-sm leading-6 text-white/55">Each accepted friend reshapes the outer silhouette. New selectable parol designs unlock at 0, 3, 10, 23, 40 and 50 friends.</p>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-white/60">Design & color palette</h3>
                <div className="space-y-3">
                  {designs.map(design => {
                    const palette = THEMES.find(item => item.key === design.designKey)
                    return <button key={design.designKey} type="button" disabled={busy} onClick={() => { setDraftDesign(design.designKey); setNotice('') }} aria-pressed={draftDesign === design.designKey} className={'flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ' + (draftDesign === design.designKey ? 'border-amber-300 bg-amber-300/10' : 'border-white/10 bg-white/5 hover:border-amber-200/50')}>
                      {palette && <svg viewBox="0 0 600 640" role="img" aria-label={design.name + ' thumbnail'} className="h-[98px] w-[86px] shrink-0 rounded-xl bg-[#0b1425]"><ProceduralOuterShell theme={palette} friendCount={0} pattern="default" /><ParolArtwork theme={palette} pattern="default" /></svg>}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{design.name}</span>
                        <span className="mt-1 block text-xs text-white/50">{design.requiredFriends <= unlockProgress ? 'Unlocked · Ready to select' : lantern?.designKey === design.designKey ? 'Previously selected · Kept unlocked' : `Preview only · Unlocks at ${design.requiredFriends} friends` }</span>
                        <span className="mt-2 flex gap-1">{palette?.colors.map((color, index) => <span key={index} className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ backgroundColor: color }} />)}</span>
                      </span>
                      <span aria-hidden="true" className="text-sm text-amber-300">{draftDesign === design.designKey ? '●' : '○'}</span>
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
                <button type="button" disabled={!changed || busy || designs.length === 0 || invalidDesign} onClick={() => void run(() => onSave(draftDesign, draftPattern), 'Your lantern customization has been saved.')} className="mt-6 w-full rounded-xl bg-amber-300 px-5 py-3.5 text-sm font-bold text-slate-900 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40">{busy ? 'Saving…' : invalidDesign ? `Locked until ${selectedDesign?.requiredFriends ?? 'more'} friends` : changed ? 'Save customization →' : 'All changes saved'}</button>
              </section>
              <InvitationManager />
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}
