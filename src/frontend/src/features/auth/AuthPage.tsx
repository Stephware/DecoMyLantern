import { useState, type FormEvent } from 'react'
import { loginHost, registerHost, type Host } from '../../lib/api'
import LanternScene from '../lantern/renderer/LanternScene'
import { THEMES } from '../customization/themes'

type Props = { onAuthenticated: (host: Host) => void }

export default function AuthPage({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'register' | 'login'>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const host = mode === 'register' ? await registerHost(email.trim(), password) : await loginHost(email.trim(), password)
      onAuthenticated(host)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function switchMode(next: 'register' | 'login') {
    setMode(next)
    setError('')
  }

  return (
    <div className="min-h-screen bg-[#080e20] text-[#fff7e5]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_25%_14%,#27385d_0%,transparent_46%),radial-gradient(ellipse_at_88%_80%,#442c37_0%,transparent_42%)]" aria-hidden="true" />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-2.5 text-sm font-bold tracking-wide sm:text-base"><span className="text-2xl text-amber-300">✦</span> Deco My Lantern</div>
        <span className="rounded-full border border-amber-200/20 bg-amber-100/5 px-3 py-1.5 text-xs text-amber-100/70">Christmas, made together</span>
      </header>
      <main className="relative mx-auto grid max-w-6xl items-center gap-8 px-5 pb-16 pt-6 sm:px-8 lg:min-h-[calc(100vh-85px)] lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:pt-0">
        <section className="min-w-0 text-center lg:text-left">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.32em] text-amber-300/80">A tradition that grows brighter</p>
          <h1 className="mx-auto max-w-xl font-serif text-4xl font-semibold leading-[1.13] tracking-tight sm:text-6xl lg:mx-0">A little light from <span className="text-amber-300">every friend.</span></h1>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-white/65 sm:text-base lg:mx-0">Create a Christmas parol that grows as the people around you add their lights. Save the messages they leave, sealed until Christmas morning.</p>
          <div className="mx-auto mt-4 max-w-[400px] lg:mx-0">
            <LanternScene friends={5} theme={THEMES[0]} />
          </div>
          <p className="text-xs text-white/35">Visual preview · Guest contributions are coming in a later release</p>
        </section>
        <section className="mx-auto w-full max-w-md rounded-[30px] border border-white/10 bg-[#131e35]/95 p-6 shadow-2xl shadow-black/20 sm:p-9" aria-label="Host account">
          <div className="mb-7 flex rounded-full border border-white/10 bg-black/20 p-1">
            <button type="button" onClick={() => switchMode('register')} aria-pressed={mode === 'register'} className={'flex-1 rounded-full px-3 py-2.5 text-sm font-semibold transition ' + (mode === 'register' ? 'bg-amber-300 text-slate-900' : 'text-white/65 hover:text-white')}>Create account</button>
            <button type="button" onClick={() => switchMode('login')} aria-pressed={mode === 'login'} className={'flex-1 rounded-full px-3 py-2.5 text-sm font-semibold transition ' + (mode === 'login' ? 'bg-amber-300 text-slate-900' : 'text-white/65 hover:text-white')}>Log in</button>
          </div>
          <h2 className="font-serif text-3xl font-semibold">{mode === 'register' ? 'Start your tradition' : 'Welcome back'}</h2>
          <p className="mt-2 text-sm leading-6 text-white/55">{mode === 'register' ? 'Create an account to make and keep your Christmas lantern.' : 'Return to your lantern and pick up where you left off.'}</p>
          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="host-email" className="mb-2 block text-sm font-medium text-white/80">Email address</label>
              <input id="host-email" type="email" required autoComplete="email" maxLength={256} value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-white/15 bg-[#090f20] px-4 py-3.5 text-sm text-white placeholder:text-white/30 focus:border-amber-300 focus:outline-none" />
            </div>
            <div>
              <label htmlFor="host-password" className="mb-2 block text-sm font-medium text-white/80">Password</label>
              <input id="host-password" type="password" required minLength={6} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" className="w-full rounded-xl border border-white/15 bg-[#090f20] px-4 py-3.5 text-sm text-white placeholder:text-white/30 focus:border-amber-300 focus:outline-none" />
              {mode === 'register' && <p className="mt-2 text-xs text-white/45">Use 6+ characters, with uppercase, lowercase, a number and a symbol.</p>}
            </div>
            {error && <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</p>}
            <button type="submit" disabled={submitting} className="mt-2 w-full rounded-xl bg-amber-300 px-5 py-3.5 text-sm font-bold text-[#1e2431] transition hover:bg-amber-200 disabled:cursor-wait disabled:opacity-60">{submitting ? 'Please wait…' : mode === 'register' ? 'Create my account →' : 'Log in →'}</button>
          </form>
          <p className="mt-6 text-center text-xs leading-5 text-white/40">One lantern per Christmas season. Your friends won’t need an account to contribute when invitations launch.</p>
        </section>
      </main>
    </div>
  )
}
