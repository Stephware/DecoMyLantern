import { useCallback, useEffect, useState } from 'react'
import LanternScene from '../lantern/renderer/LanternScene'
import { MAX_TEST_FRIENDS, stageForFriends } from '../lantern/growth/stages'
import { growthForFriends } from '../lantern/growth/outerGrowth'
import { THEMES } from '../customization/themes'
import { FirstTimeDesignPicker, MobileDesignDrawer } from '../customization/DesignSelectionPanels'
import RecoveryKeyDialog from '../owner/RecoveryKeyDialog'
import InvitationManager from '../invitations/InvitationManager'
import type { Design, Lantern } from '../../lib/api'

type Props = {
  lantern: Lantern | null
  designs: Design[]
  onCreate: () => Promise<void>
  onSave: (designKey: string, patternKey: string) => Promise<void>
  onLogout: () => Promise<void>
}

const card = 'rounded-[24px] border border-[#e6dccc] bg-[#fffdf8] shadow-[0_10px_30px_rgba(57,43,27,.05)]'
const button = 'rounded-xl bg-[#902632] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#711e28] disabled:cursor-not-allowed disabled:opacity-40'
const ONBOARDING_PREFIX = 'bemyparol:visual-choice:v1:'

export default function HostDashboard({ lantern, designs, onCreate, onSave, onLogout }: Props) {
  const [draftDesign, setDraftDesign] = useState(lantern?.designKey ?? 'classic')
  const [busy, setBusy] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [recoveryDialog, setRecoveryDialog] = useState<'view' | 'leave' | null>(null)
  const closeRecoveryDialog = useCallback(() => setRecoveryDialog(null), [])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [firstPicker, setFirstPicker] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [showTestingLab, setShowTestingLab] = useState(false)

  useEffect(() => {
    setDraftDesign(lantern?.designKey ?? 'classic')
  }, [lantern?.id, lantern?.designKey])

  useEffect(() => {
    if (!lantern?.id || !designs.length) return
    let done = false
    try { done = localStorage.getItem(ONBOARDING_PREFIX + lantern.id) === 'done' }
    catch { /* private browsing/storage unavailable: onboarding can be dismissed */ }
    if (!done && lantern.acceptedFriends === 0) {
      setFirstPicker(true)
      setPickerOpen(true)
    }
  }, [lantern?.id, lantern?.acceptedFriends, designs.length])

  const markChoice = useCallback(() => {
    if (!lantern?.id) return
    try { localStorage.setItem(ONBOARDING_PREFIX + lantern.id, 'done') }
    catch { /* localStorage affects onboarding only, never authentication */ }
  }, [lantern?.id])

  const dismissPicker = useCallback(() => {
    markChoice()
    setPickerOpen(false)
    setFirstPicker(false)
    if (lantern) {
      setDraftDesign(lantern.designKey)
    }
  }, [lantern, markChoice])

  const accepted = lantern?.acceptedFriends ?? 0
  const progress = Math.min(100, Math.round(accepted / 50 * 100))
  const savedTheme = THEMES.find(t => t.key === lantern?.designKey) ?? THEMES[0]
  const theme = THEMES.find(t => t.key === draftDesign) ?? THEMES[0]
  const changed = !!lantern && draftDesign !== lantern.designKey
  const knownDesign = designs.some(d => d.designKey === draftDesign)

  async function saveDesign(fromPicker = false) {
    if (!lantern || !knownDesign || busy) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (changed) await onSave(draftDesign, lantern.patternKey)
      setNotice('Your parol design is saved. You can change it anytime.')
      if (fromPicker) {
        markChoice()
        setPickerOpen(false)
        setFirstPicker(false)
      }
      setDrawerOpen(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save your design.')
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    setSigningOut(true)
    try { await onLogout() }
    catch (caught) {
      setSigningOut(false)
      throw caught
    }
  }

  async function createLantern() {
    setBusy(true)
    setError('')
    try { await onCreate() }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to create your parol.') }
    finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen bg-[#f7f2e9] pb-28 text-[#283a30] lg:pb-10">
      <header className="relative border-b border-[#e5dac8] bg-[#fffaf2]/95">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 sm:px-8 lg:py-5">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl text-[#a77a3d]" aria-hidden="true">✦</span>
            <span className="font-serif text-2xl font-semibold tracking-tight text-[#283b2f]">BeMyParol</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-xs text-[#806e56] md:inline">A brighter Pasko, together.</span>
            <button type="button" disabled={busy || signingOut} onClick={() => setRecoveryDialog('view')}
              className="rounded-full border border-[#d8c1a3] bg-white px-3 py-2.5 text-xs font-semibold text-[#832c31] hover:border-[#902632] disabled:opacity-50 sm:px-4">
              Recovery key
            </button>
            <button type="button" disabled={busy || signingOut} onClick={() => setRecoveryDialog('leave')}
              className="rounded-full border border-[#dfd2c0] px-3 py-2.5 text-xs font-semibold text-[#554c3d] hover:border-[#902632] hover:text-[#902632] disabled:opacity-50 sm:px-4">
              Leave parol
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 pb-10 pt-6 sm:px-8 sm:pt-9">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-7">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.24em] text-[#a27848]">Your Christmas story · {lantern?.seasonYear ?? new Date().getFullYear()}</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight text-[#24392d] sm:text-5xl">
              Your parol, <em className="font-normal text-[#982b33]">made together.</em>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#706858]">
              Every friend adds their own light. Watch something beautiful grow.
            </p>
          </div>
          {lantern && <button type="button" onClick={() => {
            setFirstPicker(false); setPickerOpen(true); setDrawerOpen(false)
          }} className="hidden rounded-full border border-[#d3c0a3] bg-[#fffdf8] px-5 py-3 text-sm font-semibold text-[#6c4034] hover:border-[#922632] lg:inline-flex">
            ✦ Explore all six designs
          </button>}
        </div>

        {(error || notice) && <div role={error ? 'alert' : 'status'}
          className={`mb-5 rounded-xl border px-4 py-3 text-sm ${error
            ? 'border-[#e3aaa5] bg-[#f8e7e3] text-[#8a2630]'
            : 'border-[#bed2bb] bg-[#eef5e9] text-[#2d5936]'}`}>
          {error || notice}
        </div>}

        {!lantern ? (
          <section className={`${card} mx-auto grid max-w-5xl items-center gap-7 p-6 sm:p-10 lg:grid-cols-2`}>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#a67f49]">Start a tradition</p>
              <h2 className="mt-3 font-serif text-3xl">Your first light starts here.</h2>
              <p className="mt-3 text-sm leading-7 text-[#706858]">
                Create your parol, then choose among six full-bloom designs. Friends can add lights without signing up.
              </p>
              <button type="button" disabled={busy} onClick={() => void createLantern()}
                className={`${button} mt-6`}>
                {busy ? 'Creating…' : 'Create my parol'}
              </button>
            </div>
            <div className="rounded-2xl bg-[#14281e] p-3">
              <LanternScene previewCount={0} theme={THEMES[0]} />
            </div>
          </section>
        ) : (
          <>
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,.75fr)] lg:gap-6">
              <section className="min-w-0 space-y-4">
                <div className="overflow-hidden rounded-[26px] border border-[#263b32] bg-[#111e1b] p-3 shadow-[0_18px_50px_rgba(29,47,37,.15)] sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-3 pt-2 sm:px-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#e2b676]">My growing parol</p>
                      <h2 className="mt-1 font-serif text-xl text-[#fff4e0] sm:text-2xl">{savedTheme.label}</h2>
                    </div>
                    <span className="rounded-full border border-[#bfa17a]/25 bg-white/5 px-3 py-2 text-xs text-[#f7e0b7]">
                      ✦ {accepted} {accepted === 1 ? 'friend' : 'friends'} shining
                    </span>
                  </div>
                  <div className="mx-auto w-full max-w-[710px]">
                    <LanternScene theme={savedTheme} pattern={lantern.patternKey}
                      contributions={lantern.lights} friendCount={lantern.acceptedFriends}
                      snapshot={{kind:'owner',stateId:lantern.id}} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-2 pt-3 sm:px-3">
                    <p className="text-xs text-[#c8ba9f]">Drag to explore · Pinch to zoom · Fit to see the whole parol</p>
                    <button type="button" onClick={() => setDrawerOpen(true)}
                      className="rounded-full border border-[#dfb680]/40 px-4 py-2 text-xs font-bold text-[#f9d8a0] hover:bg-white/10 lg:hidden">
                      ↑ Change design
                    </button>
                    <span className="hidden text-xs text-[#e8bf81] lg:inline">Each friend adds three growth layers.</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className={`${card} p-4 sm:p-5`}>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-[#8b7761]">Friends joined</div>
                    <div className="mt-1 font-serif text-3xl font-semibold text-[#286046]">{accepted}</div>
                    <p className="mt-1 text-xs text-[#827869]">Real contributions</p>
                  </div>
                  <div className={`${card} p-4 sm:p-5`}>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-[#8b7761]">Growth layers</div>
                    <div className="mt-1 font-serif text-3xl font-semibold text-[#902632]">{lantern.growthPoints}</div>
                    <p className="mt-1 text-xs text-[#827869]">Three per friend</p>
                  </div>
                  <div className={`${card} col-span-2 p-4 sm:col-span-1 sm:p-5`}>
                    <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-widest text-[#8b7761]">
                      <span>Grand parol</span><span>{progress}%</span>
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#e7dcc9]">
                      <div className="h-full rounded-full bg-[#9b783d] transition-[width] duration-500"
                        style={{width:`${progress}%`}} />
                    </div>
                    <p className="mt-2 text-xs text-[#827869]">{accepted >= 50
                      ? '50-friend milestone reached · growth continues'
                      : `${50 - accepted} friends until the 50-friend showcase`}</p>
                  </div>
                </div>

                <div className={`${card} flex items-start gap-3 p-5`}>
                  <span className="rounded-xl bg-[#f4e8ce] p-3 text-xl text-[#966732]" aria-hidden="true">✉</span>
                  <div>
                    <h3 className="font-serif text-xl">Christmas letters</h3>
                    <p className="mt-1 text-sm leading-6 text-[#786f63]">
                      Your friends' optional messages stay private and sealed until December 25, Philippine time.
                    </p>
                  </div>
                </div>
              </section>

              <aside className="min-w-0 space-y-4">
                <InvitationManager lantern={lantern} />
                <section className={`${card} hidden p-5 lg:block`}>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#a27a45]">Customize your parol</p>
                  <h2 className="mt-2 font-serif text-2xl">Choose your style</h2>
                  <div className="mt-3 flex items-center gap-3 rounded-2xl bg-[#f4ebde] p-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#1d3a30] text-3xl text-[#f4d9a4]" aria-hidden="true">✺</div>
                    <div>
                      <p className="font-semibold text-[#293b2f]">{theme.label}</p>
                      <p className="text-xs text-[#766d60]">Six styles, all available from the start</p>
                      <div className="mt-1.5 flex gap-1" aria-hidden="true">
                        {theme.colors.map((c, i) => <i key={i} className="h-2.5 w-2.5 rounded-full border border-black/10"
                          style={{backgroundColor:c}} />)}
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => {setFirstPicker(false); setPickerOpen(true)}}
                    className="mt-3 w-full rounded-xl border border-[#cfb998] bg-white px-4 py-3 text-sm font-bold text-[#85343c] hover:bg-[#fbf1e4]">
                    View six full-bloom designs
                  </button>
                  <button type="button" className={`${button} mt-5 w-full`}
                    disabled={!changed || busy || !knownDesign} onClick={() => void saveDesign()}>
                    {busy ? 'Saving…' : changed ? 'Save customization' : 'All changes saved'}
                  </button>
                  {changed && <p className="mt-2 text-xs text-[#766d60]">
                    Your saved image updates after saving. Your friend progress is preserved.
                  </p>}
                </section>

                <section className={`${card} p-5`}>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#a17849]">Your journey</p>
                  <h3 className="mt-2 font-serif text-xl">Growing brighter</h3>
                  <p className="mt-2 text-sm text-[#71685c]">
                    {stageForFriends(accepted).name} growth milestone · {Math.min(accepted, 50)} of 50 showcase friends.
                  </p>
                  <p className="mt-2 text-xs text-[#867868]">
                    Your chosen design stays yours; decorative layers continue growing past 50 friends.
                  </p>
                </section>
              </aside>
            </div>

            <section className="mt-8 rounded-2xl border border-dashed border-[#d8c7ae] bg-[#fffaf3] p-4 sm:p-5">
              <button type="button" aria-expanded={showTestingLab}
                onClick={() => setShowTestingLab(value => !value)}
                className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-[#74614e]">
                <span>Development testing lab <span className="font-normal text-[#a28f77]">· unsaved simulations</span></span>
                <span aria-hidden="true">{showTestingLab ? '↑ Hide' : '↓ Show'}</span>
              </button>
              {showTestingLab && <div className="mt-4 space-y-4 border-t border-[#e4d8c9] pt-4">
                <p className="text-xs text-[#786d60]">These controls remain available until the separate staging Admin Lab is built. Simulated friends are never sent to the API.</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="rounded-full border border-[#d7c7b4] px-3 py-2 text-xs" onClick={() => setPreviewCount(null)}>Real parol</button>
                  <button type="button" className="rounded-full border border-[#d7c7b4] px-3 py-2 text-xs" onClick={() => setPreviewCount(Math.max(0,(previewCount ?? accepted)-1))}>−1</button>
                  <button type="button" className="rounded-full border border-[#d7c7b4] px-3 py-2 text-xs" onClick={() => setPreviewCount(Math.min(MAX_TEST_FRIENDS,(previewCount ?? accepted)+1))}>+1 test friend</button>
                  <button type="button" className="rounded-full border border-[#d7c7b4] px-3 py-2 text-xs" onClick={() => setPreviewCount(0)}>Reset to 0</button>
                  {[0,3,10,20,23,35,40,45,50,60].map(n => <button type="button" key={n} onClick={() => setPreviewCount(n)}
                    className={`rounded-full border px-3 py-2 text-xs ${previewCount === n
                      ? 'border-[#902632] bg-[#f6e3df] text-[#902632]'
                      : 'border-[#d7c7b4]'}`}>{n} friends</button>)}
                </div>
                {previewCount !== null && <div className="mx-auto max-w-xl rounded-2xl bg-[#101e1d] p-3 text-white">
                  <LanternScene theme={theme} pattern={lantern.patternKey} previewCount={previewCount} />
                  <p className="mt-2 text-center text-xs text-[#e4c99f]">
                    {previewCount} simulated friends · {growthForFriends(previewCount)} growth layers · Not saved
                  </p>
                </div>}
              </div>}
            </section>
          </>
        )}
      </main>

      {lantern && !pickerOpen && <MobileDesignDrawer
        open={drawerOpen} onOpenChange={setDrawerOpen}
        designs={designs} selected={draftDesign} onSelect={setDraftDesign}
        changed={changed} busy={busy} error={error}
        onSave={() => void saveDesign()} />}

      {lantern && pickerOpen && <FirstTimeDesignPicker
        firstTime={firstPicker} designs={designs} selected={draftDesign} onSelect={setDraftDesign}
        busy={busy} error={error} onSave={() => void saveDesign(true)}
        onLater={dismissPicker} />}
      {recoveryDialog && <RecoveryKeyDialog mode={recoveryDialog}
        onClose={closeRecoveryDialog} onLeave={signOut} />}
      <footer className="mx-auto max-w-[1440px] px-4 pb-5 text-center text-xs text-[#9b8e7a] sm:px-8">
        BeMyParol · One parol per Christmas season · Keep your recovery key private.
      </footer>
    </div>
  )
}
