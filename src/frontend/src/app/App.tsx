import { useState } from 'react'
import LanternScene from '../features/lantern/renderer/LanternScene'
import { THEMES, type ThemeKey } from '../features/customization/themes'
import { nextStage, stageForFriends } from '../features/lantern/growth/stages'

export default function App() {
  const [friends, setFriends] = useState(8)
  const [themeKey, setThemeKey] = useState<ThemeKey>('classic')
  const [tab, setTab] = useState<'designs' | 'messages'>('designs')
  const theme = THEMES.find(t => t.key === themeKey) ?? THEMES[0]
  const stage = stageForFriends(friends)
  const next = nextStage(friends)
  const isUnlocked = new Date() >= new Date('2026-12-24T16:00:00Z')
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080e20] bg-[radial-gradient(ellipse_at_top,#26345b_0%,#080e20_67%)] text-[#fff8e8]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
        <a href="/" className="flex items-center gap-2 font-bold tracking-wide text-amber-100"><span aria-hidden="true" className="text-2xl">✦</span> Deco My Lantern</a>
        <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-200">UI preview</span>
      </header>
      <main className="mx-auto grid max-w-6xl gap-4 px-4 pb-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_345px] lg:gap-8">
        <section aria-labelledby="lantern-title" className="min-w-0">
          <div className="mb-2 text-center lg:pt-8">
            <p className="text-xs font-semibold uppercase tracking-[.3em] text-amber-300/80">A little light from every friend</p>
            <h1 id="lantern-title" className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">Your Christmas Parol</h1>
            <p className="mt-2 text-sm text-white/60">A growing lantern made brighter by the people around you.</p>
          </div>
          <LanternScene friends={friends} theme={theme} />
          <div className="mx-auto -mt-1 flex max-w-lg items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#111b32]/90 px-4 py-3">
            <div><div className="text-2xl font-bold text-amber-200">{friends} <span className="text-sm font-normal text-white/60">lights</span></div><p className="text-xs text-white/50">{stage.name}</p></div>
            <div className="text-right"><div className="text-sm font-semibold text-amber-100">{next ? `${next.requiredFriends-friends} to next glow` : 'Grand Parol unlocked'}</div><p className="text-xs text-white/50">{next?.name ?? 'Keep gathering lights'}</p></div>
          </div>
        </section>
        <aside className="lg:pt-12">
          <div className="rounded-3xl border border-white/10 bg-[#14213a]/90 p-5 shadow-2xl backdrop-blur">
            <div className="mb-5 flex rounded-full bg-white/5 p-1" role="tablist" aria-label="Preview panels">
              <button role="tab" aria-selected={tab==='designs'} onClick={()=>setTab('designs')} className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold ${tab==='designs'?'bg-amber-300 text-[#1c2031]':'text-white/70'}`}>Designs</button>
              <button role="tab" aria-selected={tab==='messages'} onClick={()=>setTab('messages')} className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold ${tab==='messages'?'bg-amber-300 text-[#1c2031]':'text-white/70'}`}>Messages</button>
            </div>
            {tab === 'designs' ? <section aria-label="Design selection">
              <h2 className="mb-1 font-serif text-xl">Make it yours</h2>
              <p className="mb-4 text-sm text-white/55">Choose an unlocked color theme. Structural growth is automatic.</p>
              <div className="space-y-3">
                {THEMES.map(t => {
                  const locked = friends < t.unlockAt
                  return <button type="button" key={t.key} disabled={locked} onClick={()=>setThemeKey(t.key)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${themeKey===t.key?'border-amber-300 bg-amber-200/10':'border-white/10 bg-white/5'} ${locked?'cursor-not-allowed opacity-45':'hover:border-amber-200/60'}`}>
                    <span className="flex gap-1">{t.colors.map(c=><i key={c} className="h-6 w-3 rounded-sm" style={{background:c}} />)}</span>
                    <span className="flex-1 text-sm font-semibold">{t.label}</span>
                    <span className="text-xs text-amber-200/80">{locked?`${t.unlockAt} lights`:(themeKey===t.key?'Selected':'Choose')}</span>
                  </button>
                })}
              </div>
              <p className="mt-5 rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-white/60">The final release will use curated, professional SVG artwork. This prototype uses a procedural star to test layout and growth.</p>
            </section> : <section aria-label="Christmas messages" className="space-y-4">
              <h2 className="font-serif text-xl">Christmas Letters</h2>
              <p className="text-sm text-white/65">{isUnlocked ? 'Christmas has arrived! Once connected to the API, your private messages will appear here.' : 'Your friends’ letters stay sealed until December 25 at 12:00 AM Philippine time.'}</p>
              <div className="rounded-2xl border border-amber-200/15 bg-amber-300/5 p-5 text-center"><span aria-hidden="true" className="text-3xl">✉</span><p className="mt-3 text-sm font-semibold">{isUnlocked ? 'Ready to open' : 'Sealed until Christmas'}</p><p className="mt-1 text-xs text-white/50">Message preview only — no real message data</p></div>
            </section>}
          </div>
          <div className="mt-4 rounded-3xl border border-dashed border-amber-300/30 bg-amber-300/5 p-5">
            <h2 className="font-semibold text-amber-100">Growth simulator</h2>
            <p className="mt-1 mb-4 text-sm text-white/55">Preview how the parol grows. These aren't real friends.</p>
            <label className="block text-sm text-white/75" htmlFor="friend-count">Simulated accepted friends: <strong>{friends}</strong></label>
            <input id="friend-count" className="mt-3 w-full accent-amber-300" type="range" min="0" max="60" step="1" value={friends} onChange={e=>setFriends(Number(e.target.value))} />
            <p className="mt-3 text-xs text-white/45">Real invitations, accounts, and messages will be integrated with the secured backend later.</p>
          </div>
        </aside>
      </main>
    </div>
  )
}
