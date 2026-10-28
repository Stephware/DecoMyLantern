import { useEffect, useState } from 'react'
import WelcomePage from '../features/owner/WelcomePage'
import RecoveryKeyPage from '../features/owner/RecoveryKeyPage'
import HostDashboard from '../features/dashboard/HostDashboard'
import GuestInvitationPage from '../features/invitations/GuestInvitationPage'
import { invitationTokenFromHash } from '../features/invitations/invitationLinks'
import {
  ApiError,
  createOwner,
  recoverOwner,
  getOwner,
  getLegacyOwner,
  upgradeLegacyOwner,
  signOutOwner,
  finishOwnerSetup,
  cancelOwnerCreation,
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
  const [invitationToken, setInvitationToken] = useState<string | null>(() => invitationTokenFromHash(window.location.hash))
  const [owner, setOwner] = useState<Owner | null>(null)
  const [lantern, setLantern] = useState<Lantern | null>(null)
  const [designs, setDesigns] = useState<Design[]>([])
  const [recoveryKey, setRecoveryKey] = useState('')
  const [canCancelCreation, setCanCancelCreation] = useState(false)
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

  function showIssuedKey(issued: OwnerIssue, newlyCreated = false) {
    setOwner(issued.owner)
    setLegacyAvailable(false)
    setRecoveryKey(issued.recoveryCode)
    setCanCancelCreation(newlyCreated)
    setScreen('recovery-key')
  }

  useEffect(() => {
    const onHashChange = () => setInvitationToken(invitationTokenFromHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (invitationToken !== null) return
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
  }, [invitationToken])

  // Refresh the owner's open lantern so guest contributions arrive without a
  // manual reload. Hidden tabs do not poll; returning catches up immediately.
  useEffect(() => {
    if (screen !== 'owner' || invitationToken !== null || !lantern?.id) return
    let active = true
    let fetching = false
    async function refresh() {
      if (!active || fetching || document.hidden) return
      fetching = true
      try {
        const latest = await getMyLantern()
        if (active) setLantern(current => current?.id === latest.id ? latest : current)
      } catch {
        // Temporary network failures should not replace the owner's screen.
      } finally {
        fetching = false
      }
    }
    const interval = window.setInterval(() => void refresh(), 12000)
    const onVisible = () => { if (!document.hidden) void refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [screen, invitationToken, lantern?.id])

  // Render the friend-side experience before all owner/login screens.
  if (invitationToken !== null) return <GuestInvitationPage token={invitationToken} />

  if (screen === 'loading') return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f2e9] px-5 text-center text-[#263d32]">
      <div><div className="mb-4 text-5xl text-[#ac804a]" aria-hidden="true">✦</div><p className="font-serif text-2xl">Lighting your parol…</p><p className="mt-3 text-sm text-[#766d5d]">Please wait a moment.</p></div>
    </div>
  )

  if (screen === 'error') return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f2e9] px-5 text-center text-[#27392e]">
      <div className="max-w-sm rounded-3xl border border-[#e5d8c4] bg-[#fffdf8] p-8 shadow-xl">
        <p className="text-4xl text-[#a77c40]" aria-hidden="true">✦</p>
        <h1 className="mt-4 font-serif text-2xl">Couldn't load your parol</h1>
        <p role="alert" className="mt-3 text-sm leading-6 text-[#765e56]">{error}</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-[#902632] px-5 py-3 text-sm font-bold text-white">Try again</button>
      </div>
    </div>
  )

  if (screen === 'recovery-key' && recoveryKey) {
    return <RecoveryKeyPage code={recoveryKey} onContinue={async () => {
      if (canCancelCreation) await finishOwnerSetup()
      setCanCancelCreation(false)
      setRecoveryKey('')
      if (owner) await enterDashboard(owner)
    }} onCancel={canCancelCreation ? async () => {
      await cancelOwnerCreation()
      setOwner(null)
      setLantern(null)
      setDesigns([])
      setRecoveryKey('')
      setCanCancelCreation(false)
      setScreen('welcome')
    } : undefined} />
  }

  if (screen === 'welcome' || !owner) return (
    <WelcomePage
      legacyAvailable={legacyAvailable}
      onCreate={async () => { showIssuedKey(await createOwner(), true) }}
      onRecover={async code => {
        const restored = await recoverOwner(code)
        setLegacyAvailable(false)
        await enterDashboard(restored.owner)
      }}
      onUpgradeLegacy={async () => { showIssuedKey(await upgradeLegacyOwner()) }}
    />
  )

  return (
    <HostDashboard
      lantern={lantern}
      designs={designs}
      onCreate={async () => { setLantern(await createMyLantern()) }}
      onSave={async (designKey, patternKey) => { setLantern(await updateMyLantern(designKey, patternKey)) }}
      onLogout={async () => {
        await signOutOwner()
        setOwner(null)
        setLantern(null)
        setDesigns([])
        setRecoveryKey('')
        setCanCancelCreation(false)
        setLegacyAvailable(false)
        setScreen('welcome')
      }}
    />
  )
}
