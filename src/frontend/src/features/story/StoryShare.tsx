import {useEffect, useState} from 'react'
import {exportStoryMedia} from '../../lib/api'
import {StoryFrame, type StoryData, type StoryFormat} from './StoryFrame'

type Props = {
  data: StoryData
  invitationUrl: string
  token?: string
}

export default function StoryShare({data, invitationUrl, token}: Props) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [video, setVideo] = useState<Blob | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [png, setPng] = useState<Blob | null>(null)

  useEffect(() => {
    if (!video) { setVideoUrl(''); return }
    const url = URL.createObjectURL(video)
    setVideoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [video])

  async function generate(format: StoryFormat) {
    setBusy(true)
    setMessage('')
    try {
      const blob = await exportStoryMedia(data.kind, format, token)
      if (format === 'mp4') setVideo(blob)
      else { setPng(blob); download(blob,'BeMyParol-Story.png') }
      setMessage(format === 'mp4' ? 'Your animation is ready to share or save.' : 'Story image saved.')
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Unable to prepare this Story.')
    } finally { setBusy(false) }
  }

  function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = name
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  async function share() {
    if (!video) return
    const file = new File([video], 'BeMyParol-Story.mp4', {type:'video/mp4'})
    if (!navigator.share || !navigator.canShare?.({files:[file]})) {
      setMessage('This device cannot share video files directly. Download the MP4 and upload it to Instagram or Facebook Stories.')
      return
    }
    try {
      await navigator.share({files:[file], title:'My BeMyParol Story'})
      setMessage('Your phone handled the share. Add your invitation as a Link sticker in the Story editor.')
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setMessage('Sharing was unavailable. You can download the video instead.')
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(invitationUrl)
      setMessage('Invitation link copied. Add it using the Story Link sticker.')
    } catch { setMessage('Select and copy the invitation URL below.') }
  }

  return <>
    <button type="button" onClick={() => setOpen(true)}
      className="w-full rounded-xl border border-amber-300/50 bg-amber-300/10 px-5 py-3 text-sm font-bold text-amber-100 transition hover:bg-amber-300/20">
      ✦ Share animated Story
    </button>
    {open && (
      <div role="presentation" className="fixed inset-0 z-[80] overflow-y-auto bg-[#020611]/90 p-3 backdrop-blur-md sm:p-8">
        <section role="dialog" aria-modal="true" aria-label="Share your parol Story"
          className="mx-auto max-w-3xl rounded-3xl border border-amber-300/25 bg-[#111d34] p-5 text-[#fff7e5] shadow-2xl sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl font-semibold sm:text-3xl">Your animated Story</h2>
              <p className="mt-2 text-sm text-white/60">8 seconds · vertical 9:16 · 1080 × 1920 · MP4</p>
            </div>
            <button type="button" onClick={() => setOpen(false)}
              aria-label="Close Story preview" className="rounded-lg border border-white/20 px-3 py-2 text-white">✕</button>
          </div>
          <div className="mx-auto mt-6 overflow-hidden rounded-2xl border border-white/15 bg-[#080e20]"
            style={{width:270, height:480}}>
            {videoUrl ? <video src={videoUrl} controls autoPlay loop playsInline
              className="h-full w-full object-contain" aria-label="Generated parol Story video"/> : (
              <div style={{width:1080,height:1920,transform:'scale(.25)',transformOrigin:'top left'}}>
                <StoryFrame data={data} frame={200}/>
              </div>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-white/50">
            {videoUrl ? 'Preview of your generated animation' : 'Still preview — generate the MP4 to see the three-wave animation'}
          </p>
          {message && <p role="status" className="mt-4 rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-amber-100">{message}</p>}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {!video && <button type="button" disabled={busy} onClick={() => void generate('mp4')}
              className="rounded-xl bg-amber-300 px-5 py-3 font-bold text-slate-900 disabled:opacity-50">
              {busy ? 'Rendering Story…' : 'Generate animated MP4'}
            </button>}
            {video && <button type="button" disabled={busy} onClick={() => void share()}
              className="rounded-xl bg-amber-300 px-5 py-3 font-bold text-slate-900 disabled:opacity-50">
              Share video
            </button>}
            {video && <button type="button" onClick={() => download(video,'BeMyParol-Story.mp4')}
              className="rounded-xl border border-amber-200/35 px-5 py-3 font-semibold text-amber-100">
              Download MP4
            </button>}
            <button type="button" disabled={busy} onClick={() => { if (png) download(png,'BeMyParol-Story.png'); else void generate('png') }}
              className="rounded-xl border border-white/25 px-5 py-3 font-semibold disabled:opacity-50">
              Save static PNG instead
            </button>
            <button type="button" onClick={() => void copyLink()}
              className="rounded-xl border border-white/25 px-5 py-3 font-semibold">
              Copy invitation link
            </button>
          </div>
          <div className="mt-5 rounded-xl border border-white/10 bg-[#0a1528] p-4">
            <label htmlFor="story-link" className="text-xs font-semibold text-amber-200">Your invitation URL</label>
            <input id="story-link" readOnly value={invitationUrl}
              onFocus={event => event.currentTarget.select()}
              className="mt-2 w-full rounded-lg border border-white/15 bg-[#070d1b] px-3 py-2 text-xs text-white"/>
            <p className="mt-3 text-xs leading-6 text-white/60">
              Instagram/Facebook may not open directly in Story mode. Share the MP4 from your phone
              or save and upload it manually, then use the Story editor’s <strong>Link sticker</strong>
              to paste the invitation URL. The link printed inside a video is not tappable.
            </p>
          </div>
        </section>
      </div>
    )}
  </>
}
