import { useEffect, useState } from 'react'
import WelcomePage from '../features/owner/WelcomePage'
import RecoveryKeyPage from '../features/owner/RecoveryKeyPage'
import HostDashboard from '../features/dashboard/HostDashboard'
import {
  ApiError,
  createOwner,
  recoverOwner,
  getOwner,
  getLegacyOwner,
  upgradeLegacyOwner,
  rotateRecoveryCode,
  signOutOwner,
  createMyLantern,
  getDesigns,
  getMyLantern,
  updateMyLantern,
  type Design,
  type Owner,
  type OwnerIssue,
  type Lantern,
} from '../lib/api'

type Screen = 'loading' | 'welcome' | 'recovery-key' | 'owner' | 'error'

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [owner, setOwner] = useState<Owner | null>(null)
  const [lantern, setLantern] = useState<Lantern | null>(null)
  const [designs, setDesigns] = useState<Design[]>([])
  const [recoveryKey, setRecoveryKey] = useState('')
  const [legacyAvailable, setLegacyAvailable] = useState(false)
  const [error, setError] = useState('')

  async function enterDashboard(currentOwner: Owner) {
    setScreen('loading')
    setOwner(currentOwner)
    setError('')
    try {
      const [lanternResult, designsResult] = await Promise.allSettled([getMyLantern(), getDesigns()])
      if (lanternResult.status === 'rejected') {
        const failure: unknown = lanternResult.reason
        if (!(failure instanceof ApiError && failure.status === 404)) throw failure
        setLantern(null)
      } else {
        setLantern(lanternResult.value)
      }
      if (designsResult.status === 'rejected') throw designsResult.reason
      setDesigns(designsResult.value)
      setScreen('owner')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load your parol.')
      setScreen('error')
    }
  }

  function showIssuedKey(issued: OwnerIssue) {
    setOwner(issued.owner)
    setLegacyAvailable(false)
    setRecoveryKey(issued.recoveryCode)
    setScreen('recovery-key')
  }

  useEffect(() => {
    let mounted = true
    void getOwner().then(currentOwner => {
      if (mounted) void enterDashboard(currentOwner)
    }).catch(async caught => {
      if (!mounted) return
      if (!(caught instanceof ApiError && caught.status === 401)) {
        setError(caught instanceof Error ? caught.message : 'Unable to connect to the API.')
        setScreen('error')
        return
      }
      try {
        const legacy = await getLegacyOwner()
        if (mounted) setLegacyAvailable(legacy.available)
      } catch {
        // A missing legacy cookie is normal for new visitors.
      }
      if (mounted) setScreen('welcome')
    })
    return () => { mounted = false }
  }, [])

  if (screen === 'loading') return (
    <div className="flex min-h-screen items-center justify-center bg-[#080e20] px-5 text-center text-amber-100">
      <div><div className="mb-4 text-5xl text-amber-300" aria-hidden="true">✦</div><p className="font-serif text-2xl">Lighting your parol…</p><p className="mt-3 text-sm text-white/45">Please wait a moment.</p></div>
    </div>
  )

  if (screen === 'error') return (
    <div className="flex min-h-screen items-center justify-center bg-[#080e20] px-5 text-center text-white">
      <div className="max-w-sm rounded-3xl border border-white/10 bg-[#15203a] p-8">
        <p className="text-4xl text-amber-300" aria-hidden="true">✦</p>
        <h1 className="mt-4 font-serif text-2xl">Couldn't load your parol</h1>
        <p role="alert" className="mt-3 text-sm leading-6 text-white/60">{error}</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-amber-300 px-5 py-3 text-sm font-bold text-slate-900">Try again</button>
      </div>
    </div>
  )

  if (screen === 'recovery-key' && recoveryKey) {
    return <RecoveryKeyPage code={recoveryKey} onContinue={() => {
      setRecoveryKey('')
      if (owner) void enterDashboard(owner)
    }} />
  }

  if (screen === 'welcome' || !owner) return (
    <WelcomePage
      legacyAvailable={legacyAvailable}
      onCreate={async () => { showIssuedKey(await createOwner()) }}
      onRecover={async code => { showIssuedKey(await recoverOwner(code)) }}
      onUpgradeLegacy={async () => { showIssuedKey(await upgradeLegacyOwner()) }}
    />
  )

  return (
    <HostDashboard
      lantern={lantern}
      designs={designs}
      onCreate={async () => { setLantern(await createMyLantern()) }}
      onSave={async (designKey, patternKey) => { setLantern(await updateMyLantern(designKey, patternKey)) }}
      onRegenerateRecovery={async () => {
        const result = await rotateRecoveryCode()
        setRecoveryKey(result.recoveryCode)
        setScreen('recovery-key')
      }}
      onLogout={async () => {
        await signOutOwner()
        setOwner(null)
        setLantern(null)
        setDesigns([])
        setRecoveryKey('')
        setLegacyAvailable(false)
        setScreen('welcome')
      }}
    />
  )
}
