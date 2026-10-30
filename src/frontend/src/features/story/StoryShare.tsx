import {useEffect, useRef, useState} from 'react'
import {exportStoryMedia} from '../../lib/api'
import {StoryFrame, type StoryData, type StoryFormat} from './StoryFrame'

type Props = {
  data: StoryData
  invitationUrl: string
  token?: string
}

const primary = 'w-full rounded-xl bg-[#8b2b35] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#70212c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b68c49] disabled:cursor-not-allowed disabled:opacity-50'
const secondary = 'w-full rounded-xl border border-[#d4c5ad] bg-white px-4 py-3 text-sm font-semibold text-[#394b3d] transition hover:bg-[#f8f0e3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b68c49] disabled:cursor-not-allowed disabled:opacity-50'

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

/**
 * Phase 2: one sharing experience for existing PNG Story posters and MP4 Stories.
 * Phase 3 can replace the PNG poster with a standalone parol image without
 * changing the format selector or native share/download controls.
 */
export default function StoryShare({data, invitationUrl, token}: Props) {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState<StoryFormat>('png')
  const [busy, setBusy] = useState<StoryFormat | null>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [video, setVideo] = useState<Blob | null>(null)
  const [png, setPng] = useState<Blob | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [pngUrl, setPngUrl] = useState('')
  const [previewScale, setPreviewScale] = useState(.25)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  // Props are recreated during owner polling, so track the actual saved parol,
  // not the identity of the data object. Never share a previous parol's export.
  const dataKey = [data.kind, data.designKey, data.patternKey, data.friendCount,
    data.slots.join(','), data.highlightSlot ?? ''].join('|')
  const latestDataKey = useRef(dataKey)
  latestDataKey.current = dataKey

  useEffect(() => {
    setVideo(null)
    setPng(null)
    setBusy(null)
    setNotice('')
    setError('')
  }, [dataKey])

  useEffect(() => {
    if (!video) { setVideoUrl(''); return }
    const url = URL.createObjectURL(video)
    setVideoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [video])

  useEffect(() => {
    if (!png) { setPngUrl(''); return }
    const url = URL.createObjectURL(png)
    setPngUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [png])

  // Keep keyboard focus in the dialog, restore it to the opener on close,
  // and stop the underlying page scrolling on mobile.
  useEffect(() => {
    if (!open) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return }
      if (event.key !== 'Tab') return
      const elements = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )
      if (!elements?.length) return
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = originalOverflow
      triggerRef.current?.focus()
    }
  }, [open])

  // Scale the original 1080 x 1920 Story artwork to any phone width.
  useEffect(() => {
    if (!open || !previewRef.current) return
    const element = previewRef.current
    const measure = () => setPreviewScale(element.clientWidth / 1080)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [open])

  async function generate(selected: StoryFormat) {
    if (busy) return
    const requestedKey = dataKey
    setBusy(selected)
    setNotice('')
    setError('')
    try {
      const blob = await exportStoryMedia(data.kind, selected, token)
      if (latestDataKey.current !== requestedKey) return
      if (selected === 'mp4') setVideo(blob)
      else setPng(blob)
      setNotice(selected === 'mp4' ? 'Your animated Story is ready.' : 'Your PNG Story poster is ready.')
    } catch (caught) {
      if (latestDataKey.current === requestedKey)
        setError(caught instanceof Error ? caught.message : 'Unable to prepare your media. Try again.')
    } finally {
      if (latestDataKey.current === requestedKey) setBusy(null)
    }
  }

  async function share(selected: StoryFormat) {
    const blob = selected === 'png' ? png : video
    if (!blob) return
    const image = selected === 'png'
    const file = new File([blob], image ? 'BeMyParol-Story.png' : 'BeMyParol-Story.mp4',
      {type: image ? 'image/png' : 'video/mp4'})
    setError('')
    setNotice('')
    if (!navigator.share || !navigator.canShare?.({files: [file]})) {
      setNotice('Direct file sharing is not available on this device. Download the file and upload it in your chosen app.')
      return
    }
    try {
      await navigator.share({files: [file], title: 'My BeMyParol Story'})
      setNotice('Shared through your device. Add your invitation link separately when needed.')
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return
      setError('Sharing was unavailable. Download the file and try from your preferred app.')
    }
  }

  async function copyLink() {
    setError('')
    try {
      await navigator.clipboard.writeText(invitationUrl)
      setNotice('Invitation link copied.')
    } catch {
      setError('Unable to copy automatically. Select the link below to copy it.')
    }
  }

  const ready = format === 'png' ? png : video
  const fileName = format === 'png' ? 'BeMyParol-Story.png' : 'BeMyParol-Story.mp4'

  return <>
    <button ref={triggerRef} type="button" onClick={() => setOpen(true)}
      className="w-full rounded-xl border border-[#d8b77f] bg-[#fff0d8] px-5 py-3.5 text-sm font-bold text-[#762732] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bd9656]">
      ✦ Share your parol
    </button>
    {open && (
      <div role="presentation" onMouseDown={event => {
        if (event.target === event.currentTarget) setOpen(false)
      }} className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0b1c17]/85 p-2 backdrop-blur-sm sm:p-5">
        <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="share-parol-title"
          className="max-h-[calc(100dvh-1rem)] w-full max-w-5xl overflow-y-auto rounded-[24px] border border-[#dcc8a6] bg-[#fbf7ef] text-[#283e31] shadow-2xl sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-[30px]">
          <header className="flex items-start justify-between gap-4 border-b border-[#e7dac5] px-4 py-5 sm:px-8 sm:py-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#a47c45]">Spread the Christmas light</p>
              <h2 id="share-parol-title" className="mt-1 font-serif text-2xl font-semibold text-[#283e31] sm:text-4xl">Share your parol</h2>
              <p className="mt-1 text-sm text-[#756c5e]">Choose an image or an animated Story to share.</p>
            </div>
            <button ref={closeRef} type="button" aria-label="Close sharing dialog"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-full border border-[#ddcbb4] bg-white px-3 py-2 text-[#7d2c35] hover:bg-[#f2e6d6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b68c49]">✕</button>
          </header>

          <div className="grid gap-5 p-3 sm:gap-7 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.94fr)]">
            <div className="flex flex-col items-center justify-center rounded-[22px] border border-[#496554] bg-[radial-gradient(ellipse_at_50%_42%,#315444,#10291f_75%)] px-3 py-5 text-center shadow-inner sm:px-6 sm:py-7">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[.16em] text-[#e4c78d]">
                {format === 'png' ? 'Still image preview' : 'Animated Story preview'}
              </p>
              <div ref={previewRef} className="relative aspect-[9/16] w-full max-w-[240px] overflow-hidden rounded-xl border-[3px] border-[#d6b575]/65 bg-[#0a1520] shadow-[0_15px_45px_rgba(0,0,0,.35)] sm:max-w-[270px]">
                {format === 'mp4' && videoUrl ? (
                  <video key={videoUrl} src={videoUrl} controls loop playsInline
                    aria-label="Generated animated parol Story" className="h-full w-full object-contain"/>
                ) : format === 'png' && pngUrl ? (
                  <img src={pngUrl} alt="Generated still BeMyParol Story poster" className="h-full w-full object-contain"/>
                ) : (
                  <div aria-label="Preview of your BeMyParol Story poster" role="img"
                    style={{width:1080, height:1920, transform:'scale(' + previewScale + ')', transformOrigin:'top left'}}>
                    <StoryFrame data={data} frame={200}/>
                  </div>
                )}
              </div>
              <p className="mt-4 max-w-sm text-xs leading-5 text-[#f2e2be]">
                {format === 'png'
                  ? 'PNG uses the existing Story poster. A parol-only photo is coming in Phase 3.'
                  : videoUrl ? 'Play your generated animation above.' : 'This is a still preview. Generate the video to watch the animation.'}
              </p>
            </div>

            <div className="flex min-w-0 flex-col gap-4 px-1 py-2 sm:px-0">
              <div>
                <h3 className="font-serif text-xl font-semibold text-[#2b4335] sm:text-2xl">Choose your format</h3>
                <div role="group" aria-label="Choose sharing format" className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" aria-pressed={format === 'png'} onClick={() => {setFormat('png'); setNotice(''); setError('')}}
                    className={format === 'png'
                      ? 'rounded-2xl border-2 border-[#882d39] bg-[#f8e9de] px-3 py-4 text-left text-[#762732] shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b68c49]'
                      : 'rounded-2xl border-2 border-[#ded1bf] bg-white px-3 py-4 text-left text-[#46564a] hover:border-[#bd9656] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b68c49]'}>
                    <span aria-hidden="true" className="text-xl">▧</span>
                    <span className="mt-1 block text-sm font-bold">Static image</span>
                    <span className="block text-xs opacity-75">PNG poster</span>
                  </button>
                  <button type="button" aria-pressed={format === 'mp4'} onClick={() => {setFormat('mp4'); setNotice(''); setError('')}}
                    className={format === 'mp4'
                      ? 'rounded-2xl border-2 border-[#882d39] bg-[#f8e9de] px-3 py-4 text-left text-[#762732] shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b68c49]'
                      : 'rounded-2xl border-2 border-[#ded1bf] bg-white px-3 py-4 text-left text-[#46564a] hover:border-[#bd9656] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b68c49]'}>
                    <span aria-hidden="true" className="text-xl">▶</span>
                    <span className="mt-1 block text-sm font-bold">Animated Story</span>
                    <span className="block text-xs opacity-75">MP4 video</span>
                  </button>
                </div>
              </div>

              {error && <p role="alert" className="rounded-xl border border-[#e2b1aa] bg-[#fff0ec] p-3 text-sm text-[#8a2b35]">{error}</p>}
              {notice && <p role="status" className="rounded-xl border border-[#c5d2bb] bg-[#edf3e9] p-3 text-sm text-[#2b593d]">{notice}</p>}
              {busy && <p role="status" className="text-sm text-[#665d4e]">
                Preparing your {busy === 'png' ? 'image' : 'animation'}…
              </p>}

              <div className="space-y-2">
                {!ready ? (
                  <button type="button" disabled={busy !== null} onClick={() => void generate(format)}
                    className={primary}>
                    {busy === format ? 'Preparing…' : format === 'png' ? 'Prepare PNG image' : 'Generate animated MP4'}
                  </button>
                ) : (
                  <>
                    <button type="button" disabled={busy !== null} onClick={() => void share(format)} className={primary}>
                      {format === 'png' ? 'Share image' : 'Share video'}
                    </button>
                    <button type="button" onClick={() => download(ready, fileName)} className={secondary}>
                      {format === 'png' ? 'Download PNG' : 'Download MP4'}
                    </button>
                  </>
                )}
                <button type="button" onClick={() => void copyLink()} className={secondary}>
                  Copy invitation link
                </button>
              </div>

              <div className="mt-auto rounded-2xl border border-[#e4d8c6] bg-[#f4eddf] p-4">
                <label htmlFor="share-invitation-link" className="block text-xs font-bold text-[#475d4c]">
                  Your invitation link
                </label>
                <input id="share-invitation-link" readOnly value={invitationUrl}
                  onFocus={event => event.currentTarget.select()}
                  className="mt-2 w-full rounded-lg border border-[#d7c9b2] bg-white px-3 py-2.5 text-xs text-[#374d40]"/>
                <p className="mt-2 text-xs leading-5 text-[#786c5b]">
                  If your app does not support direct sharing, download the file and upload it there.
                  For Stories, add your invitation using the app’s Link sticker.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    )}
  </>
}
