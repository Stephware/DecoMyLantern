import { useEffect, useState, type FormEvent } from 'react'
import { contributeInvitation, previewInvitation, type InvitationPreview } from '../../lib/api'
import LanternScene from '../lantern/renderer/LanternScene'
import { THEMES } from '../customization/themes'
import { isValidInvitationToken, invitationUrl } from './invitationLinks'
import StoryShare from '../story/StoryShare'

type Props = { token: string }

export default function GuestInvitationPage({ token }: Props) {
  const [preview, setPreview] = useState<InvitationPreview | null>(null)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [ownSlot, setOwnSlot] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (!isValidInvitationToken(token)) {
      setError('This invitation link is invalid. Ask your friend for a new one.')
      setLoading(false)
      return
    }
    void previewInvitation(token)
      .then(data => { if (active) { setPreview(data); setError('') } })
      .catch(caught => {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to open this parol.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token])

  async function contribute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || sending || preview?.alreadyContributed) return
    setSending(true)
    setError('')
    try {
      const result = await contributeInvitation(token, name.trim(), message.trim())
      setPreview(result.parol)
      setSubmitted(true)
      setOwnSlot(result.slotIndex)
      setMessage('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to add your light. Try again.')
      // If a duplicate/uncertain request occurred, refresh the accepted state
      // without retrying the write and accidentally creating another light.
      try { setPreview(await previewInvitation(token)) } catch { /* keep original error */ }
    } finally {
      setSending(false)
    }
  }

  const theme = THEMES.find(item => item.key === preview?.designKey) ?? THEMES[0]
  const contributions = preview?.lights.map(light => ({
    id: light.id,
    slotIndex: light.slotIndex,
    // Public guest view intentionally omits contributor names.
    displayName: 'A friend’s light',
  })) ?? []
  const alreadyContributed = submitted || preview?.alreadyContributed === true

  return (
    <main className="relative min-h-screen bg-[#080e20] px-4 pb-12 pt-6 text-[#fff7e5] sm:px-6 sm:pt-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_40%_0%,#27385d_0%,transparent_50%),radial-gradient(ellipse_at_88%_85%,#442c37_0%,transparent_40%)]" />
      <div className="relative mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <a href="/" className="inline-flex items-center gap-2 text-base font-bold tracking-wide text-amber-100">
            <span className="text-2xl text-amber-300">✦</span> BeMyParol
          </a>
          <span className="rounded-full border border-amber-200/20 bg-amber-100/5 px-3 py-1.5 text-xs text-amber-100/70">
            A little light from every friend
          </span>
        </header>
        <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
          <section className="min-w-0 rounded-3xl border border-white/10 bg-[#121d33]/70 p-4 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/80">A parol of friendship</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">
              You’ve been invited to add a light!
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/60">
              This Christmas parol becomes brighter with every friend. Your light will join the others,
              while your optional note stays private until Christmas Day in the Philippines.
            </p>
            {preview ? (
              <>
                <div className="mx-auto mt-4 max-w-[560px]">
                  <LanternScene theme={theme} pattern={preview.patternKey} contributions={contributions} />
                </div>
                <p className="mt-1 text-center text-xs text-white/50">
                  {preview.acceptedFriends} {preview.acceptedFriends === 1 ? 'friend has' : 'friends have'} lit this parol · {preview.growthPoints} growth layers
                </p>
              </>
            ) : (
              <div className="mt-8 flex min-h-72 items-center justify-center rounded-2xl border border-white/10 bg-[#0b1327] text-center text-sm text-white/50">
                {loading ? 'Opening your friend’s parol…' : 'This parol is unavailable.'}
              </div>
            )}
          </section>
          <aside className="rounded-3xl border border-amber-200/15 bg-[#131e35]/95 p-5 shadow-xl sm:p-8">
            {alreadyContributed ? (
              <div role="status">
                <div className="text-4xl text-amber-300" aria-hidden="true">✦</div>
                <h2 className="mt-3 font-serif text-3xl font-semibold">
                  {submitted ? 'Your light is shining!' : 'Your light is already here!'}
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/65">
                  You grew the lantern by three whole decorative layers and completed one illuminated outer band. Only one light can be added per browser visitor.
                  Your Christmas message, if you left one, is visible only to the owner on December 25 (Philippine time).
                </p>
                {preview && <div className="mt-5">
                  <StoryShare invitationUrl={invitationUrl(window.location.origin, token)} token={token}
                    data={{kind:'friend',designKey:preview.designKey,patternKey:preview.patternKey,
                      friendCount:preview.acceptedFriends,slots:preview.lights.map(light=>light.slotIndex),
                      highlightSlot:ownSlot}} />
                </div>}
                <a href="/" className="mt-6 inline-block rounded-xl border border-amber-300/40 px-5 py-3 text-sm font-semibold text-amber-100">
                  Make my own parol →
                </a>
              </div>
            ) : (
              <>
                <h2 className="font-serif text-3xl font-semibold">Leave your light</h2>
                <p className="mt-3 text-sm leading-6 text-white/60">
                  Add your name and an optional Christmas greeting. No account required.
                </p>
                {error && <p role="alert" className="mt-4 rounded-xl border border-rose-300/30 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</p>}
                <form onSubmit={contribute} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="friend-name" className="mb-2 block text-sm font-semibold text-white/80">Your name</label>
                    <input id="friend-name" autoComplete="name" maxLength={80} required disabled={!preview || sending}
                      value={name} onChange={event => setName(event.target.value)}
                      placeholder="How your friend knows you"
                      className="w-full rounded-xl border border-white/15 bg-[#090f20] px-4 py-3.5 text-sm text-white placeholder:text-white/35 focus:border-amber-300 focus:outline-none disabled:opacity-50" />
                  </div>
                  <div>
                    <label htmlFor="friend-message" className="mb-2 block text-sm font-semibold text-white/80">
                      Christmas message <span className="font-normal text-white/45">(optional)</span>
                    </label>
                    <textarea id="friend-message" maxLength={500} rows={5} disabled={!preview || sending}
                      value={message} onChange={event => setMessage(event.target.value)}
                      placeholder="A wish, a memory, or a little thank-you…"
                      className="w-full resize-y rounded-xl border border-white/15 bg-[#090f20] px-4 py-3.5 text-sm text-white placeholder:text-white/35 focus:border-amber-300 focus:outline-none disabled:opacity-50" />
                    <p className="mt-1 text-right text-xs text-white/45">{message.length}/500</p>
                  </div>
                  <button type="submit" disabled={!preview || !name.trim() || sending}
                    className="w-full rounded-xl bg-amber-300 px-5 py-3.5 text-sm font-bold text-slate-900 transition hover:bg-amber-200 disabled:opacity-45">
                    {sending ? 'Adding your light…' : 'Add my light ✦'}
                  </button>
                </form>
                <p className="mt-4 text-xs leading-5 text-white/45">
                  Your name helps identify your contribution to the parol owner.
                  Your note is not publicly displayed. One contribution per guest browser is permitted.
                </p>
              </>
            )}
          </aside>
        </div>
      </div>
    </main>
  )
}
