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
    <main className="min-h-screen bg-[#f7f2e9] px-4 pb-14 text-[#273a30] sm:px-7">
      <div className="mx-auto max-w-[1250px]">
        <header className="flex items-center justify-between gap-3 border-b border-[#e2d8c8] py-5">
          <a href="/" className="inline-flex items-center gap-2 font-serif text-2xl font-semibold text-[#293c30]">
            <span className="text-[#aa7c3b]" aria-hidden="true">✦</span> BeMyParol
          </a>
          <span className="hidden text-xs font-medium text-[#7d6d55] sm:block">A little light from every friend</span>
        </header>
        <div className="pb-5 pt-7 sm:pt-9">
          <p className="text-[11px] font-bold uppercase tracking-[.23em] text-[#a57b43]">You’re part of something special</p>
          <h1 className="mt-2 max-w-3xl font-serif text-3xl font-semibold leading-tight sm:text-5xl">
            Add your light to a brighter <span className="text-[#902632]">Christmas.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#746b5e]">
            Your friend's parol grows as people join. Add one light and an optional greeting
            that stays private until Christmas Day.
          </p>
          {!alreadyContributed && <a href="#add-light"
            className="mt-3 inline-flex rounded-full border border-[#d2bda1] px-4 py-2 text-sm font-semibold text-[#832c31] lg:hidden">
            Share my light ↓
          </a>}
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)] lg:gap-6">
          <section className="min-w-0 overflow-hidden rounded-[26px] border border-[#284037] bg-[#13251f] p-3 shadow-[0_18px_40px_rgba(39,52,39,.13)] sm:p-5">
            <div className="flex items-center justify-between gap-2 px-2 py-2 sm:px-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#dbb87d]">A parol of friendship</p>
                <h2 className="mt-1 font-serif text-2xl text-[#fff4e1]">{theme.label}</h2>
              </div>
              {preview && <span className="rounded-full border border-white/20 bg-white/5 px-3 py-2 text-xs text-[#f6dcab]">
                {preview.acceptedFriends} {preview.acceptedFriends === 1 ? 'friend' : 'friends'}
              </span>}
            </div>
            {preview ? (
              <>
                <div className="mx-auto w-full max-w-[620px]">
                  <LanternScene theme={theme} pattern={preview.patternKey}
                    contributions={contributions} friendCount={preview.acceptedFriends}
                    snapshot={{kind:'guest',stateId:token,token}} />
                </div>
                <p className="px-2 pb-2 pt-3 text-center text-xs text-[#d8c5a6]">
                  {preview.growthPoints} real decorative layers · Your light joins the others
                </p>
              </>
            ) : (
              <div role="status" className="mt-6 flex min-h-72 items-center justify-center rounded-xl bg-[#0d1918] px-5 text-center text-sm text-[#e1d0b8]">
                {loading ? 'Opening your friend’s parol…' : 'This parol is unavailable.'}
              </div>
            )}
          </section>

          <aside id="add-light" className="scroll-mt-6 rounded-[26px] border border-[#e6d8c5] bg-[#fffdf8] p-6 shadow-[0_12px_35px_rgba(59,45,30,.07)] sm:p-8">
            {alreadyContributed ? (
              <div role="status">
                <span className="text-4xl text-[#ab7d3f]" aria-hidden="true">✦</span>
                <h2 className="mt-3 font-serif text-3xl font-semibold">
                  {submitted ? 'Your light is shining!' : 'Your light is already here!'}
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#746b5d]">
                  Your contribution adds three decorative growth layers and one completed outer band.
                  One light is allowed per guest browser. Your optional message stays sealed until December 25.
                </p>
                {preview && <div className="mt-5 rounded-xl bg-[#872632] p-3">
                  <StoryShare invitationUrl={invitationUrl(window.location.origin, token)} token={token}
                    data={{kind:'friend',designKey:preview.designKey,patternKey:preview.patternKey,
                      friendCount:preview.acceptedFriends,slots:preview.lights.map(light=>light.slotIndex),
                      highlightSlot:ownSlot}} />
                </div>}
                <a href="/" className="mt-6 inline-block rounded-xl bg-[#902632] px-5 py-3 text-sm font-bold text-white">
                  Create my own parol →
                </a>
              </div>
            ) : (
              <>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#a47a43]">A simple gift of friendship</p>
                <h2 className="mt-2 font-serif text-3xl font-semibold">Share your light.</h2>
                <p className="mt-3 text-sm leading-6 text-[#746b5d]">
                  No account required. Your name helps your friend recognize your light.
                </p>
                {error && <p role="alert" className="mt-4 rounded-xl border border-[#e4b3ab] bg-[#fff0ec] p-3 text-sm text-[#922632]">{error}</p>}
                <form onSubmit={contribute} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="friend-name" className="mb-2 block text-sm font-semibold text-[#39493c]">Your name</label>
                    <input id="friend-name" autoComplete="name" maxLength={80} required
                      disabled={!preview || sending} value={name} onChange={event => setName(event.target.value)}
                      placeholder="How your friend knows you"
                      className="w-full rounded-xl border border-[#d8c8b5] bg-white px-4 py-3.5 text-sm text-[#263c30] placeholder:text-[#a29a8d] focus:border-[#a57842] focus:outline-none disabled:opacity-50" />
                  </div>
                  <div>
                    <label htmlFor="friend-message" className="mb-2 block text-sm font-semibold text-[#39493c]">
                      Christmas message <span className="font-normal text-[#8b7d6d]">(optional)</span>
                    </label>
                    <textarea id="friend-message" maxLength={500} rows={5}
                      disabled={!preview || sending} value={message} onChange={event => setMessage(event.target.value)}
                      placeholder="A wish, a memory, or a little thank-you…"
                      className="w-full resize-y rounded-xl border border-[#d8c8b5] bg-white px-4 py-3.5 text-sm text-[#263c30] placeholder:text-[#a29a8d] focus:border-[#a57842] focus:outline-none disabled:opacity-50" />
                    <p className="mt-1 text-right text-xs text-[#8b7d6d]">{message.length}/500</p>
                  </div>
                  <button type="submit" disabled={!preview || !name.trim() || sending}
                    className="w-full rounded-xl bg-[#902632] px-5 py-3.5 text-sm font-bold text-white hover:bg-[#74202b] disabled:opacity-45">
                    {sending ? 'Sharing your light…' : 'Share my light ✦'}
                  </button>
                </form>
                <p className="mt-4 text-xs leading-5 text-[#887c6e]">
                  Your note is not public. Only the owner can read it on Christmas Day.
                  One contribution per guest browser is permitted.
                </p>
              </>
            )}
          </aside>
        </div>
      </div>
    </main>
  )
}
