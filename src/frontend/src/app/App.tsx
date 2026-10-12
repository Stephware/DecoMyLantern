import { useEffect, useState } from 'react'
import AuthPage from '../features/auth/AuthPage'
import HostDashboard from '../features/dashboard/HostDashboard'
import {
  ApiError,
  createMyLantern,
  getDesigns,
  getMe,
  getMyLantern,
  logoutHost,
  updateMyLantern,
  type Design,
  type Host,
  type Lantern,
} from '../lib/api'

type Screen = 'loading' | 'guest' | 'host' | 'error'

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading')
  const [host, setHost] = useState<Host | null>(null)
  const [lantern, setLantern] = useState<Lantern | null>(null)
  const [designs, setDesigns] = useState<Design[]>([])
  const [error, setError] = useState('')

  async function enterDashboard(currentHost: Host) {
    setScreen('loading')
    setHost(currentHost)
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
      setScreen('host')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load your account.')
      setScreen('error')
    }
  }

  useEffect(() => {
    let mounted = true
    void getMe().then(async currentHost => {
      if (mounted) await enterDashboard(currentHost)
    }).catch(caught => {
      if (!mounted) return
      if (caught instanceof ApiError && caught.status === 401) {
        setScreen('guest')
      } else {
        setError(caught instanceof Error ? caught.message : 'Unable to connect to the API.')
        setScreen('error')
      }
    })
    return () => { mounted = false }
  }, [])

  if (screen === 'loading') return (
    <div className="flex min-h-screen items-center justify-center bg-[#080e20] px-5 text-center text-amber-100">
      <div><div className="mb-4 text-5xl text-amber-300" aria-hidden="true">✦</div><p className="font-serif text-2xl">Lighting your lantern…</p><p className="mt-3 text-sm text-white/45">Please wait a moment.</p></div>
    </div>
  )

  if (screen === 'error') return (
    <div className="flex min-h-screen items-center justify-center bg-[#080e20] px-5 text-center text-white">
      <div className="max-w-sm rounded-3xl border border-white/10 bg-[#15203a] p-8">
        <p className="text-4xl text-amber-300" aria-hidden="true">✦</p>
        <h1 className="mt-4 font-serif text-2xl">Couldn't load your lantern</h1>
        <p role="alert" className="mt-3 text-sm leading-6 text-white/60">{error}</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-amber-300 px-5 py-3 text-sm font-bold text-slate-900">Try again</button>
      </div>
    </div>
  )

  if (screen === 'guest' || !host) return <AuthPage onAuthenticated={currentHost => { void enterDashboard(currentHost) }} />

  return (
    <HostDashboard
      host={host}
      lantern={lantern}
      designs={designs}
      onCreate={async () => { setLantern(await createMyLantern()) }}
      onSave={async (designKey, patternKey) => { setLantern(await updateMyLantern(designKey, patternKey)) }}
      onLogout={async () => {
        await logoutHost()
        setHost(null)
        setLantern(null)
        setDesigns([])
        setScreen('guest')
      }}
    />
  )
}
