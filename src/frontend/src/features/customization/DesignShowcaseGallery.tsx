import { useEffect, useRef, useState } from 'react'
import { THEMES } from './themes'
import type { Design } from '../../lib/api'

type Props = {
  designs: readonly Design[]
  selected: string
  onChoose: (key: string) => void
  enabled: boolean
  disabled?: boolean
}

const artworkCache = new Map<string, Blob>()
const SHOWCASE_VERSION = 'v1'

/** Loads a small, fixed catalogue sequentially so the private renderer is
 * not flooded with six cold 150-layer Remotion compositions at once. */
async function loadPreview(key: string, signal: AbortSignal): Promise<Blob> {
  const cached = artworkCache.get(key)
  if (cached) return cached
  for (let attempt = 0; attempt < 4; attempt++) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    const response = await fetch(
      `/api/designs/${encodeURIComponent(key)}/showcase?v=${SHOWCASE_VERSION}`,
      { signal, credentials:'same-origin' },
    )
    if (response.ok) {
      const blob = await response.blob()
      if (blob.type !== 'image/webp') throw new Error('Unexpected preview format')
      artworkCache.set(key, blob)
      return blob
    }
    if (response.status !== 503 || attempt === 3)
      throw new Error('Full-bloom preview unavailable')
    await new Promise<void>(resolve => {
      const id = window.setTimeout(resolve, 1700 + attempt * 1200)
      signal.addEventListener('abort', () => { window.clearTimeout(id); resolve() }, {once:true})
    })
  }
  throw new Error('Full-bloom preview unavailable')
}

export default function DesignShowcaseGallery({
  designs, selected, onChoose, enabled, disabled = false,
}: Props) {
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [failed, setFailed] = useState<string[]>([])
  const [retry, setRetry] = useState(0)
  const urls = useRef<Set<string>>(new Set())
  const keys = designs.map(item => item.designKey).join('|')

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    let active = true
    setPreviews({})
    setFailed([])
    const made: string[] = []

    async function loadAll() {
      for (const key of keys.split('|').filter(Boolean)) {
        if (!active || controller.signal.aborted) break
        try {
          const blob = await loadPreview(key, controller.signal)
          if (!active || controller.signal.aborted) break
          const url = URL.createObjectURL(blob)
          made.push(url)
          urls.current.add(url)
          setPreviews(previous => ({...previous, [key]:url}))
        } catch {
          if (!active || controller.signal.aborted) break
          setFailed(current => [...current, key])
        }
      }
    }
    void loadAll()
    return () => {
      active = false
      controller.abort()
      for (const url of made) {
        URL.revokeObjectURL(url)
        urls.current.delete(url)
      }
    }
  }, [keys, enabled, retry])

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="group"
        aria-label="Choose from six parol styles at 50 friends">
        {designs.map(design => {
          const palette = THEMES.find(item => item.key === design.designKey)
          const isSelected = selected === design.designKey
          return (
            <button key={design.designKey} type="button"
              disabled={disabled} aria-pressed={isSelected}
              onClick={() => onChoose(design.designKey)}
              className={`group min-w-0 overflow-hidden rounded-2xl border-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-wait ${isSelected
                ? 'border-[#91222c] bg-[#fff9ee] ring-2 ring-[#91222c]/15'
                : 'border-[#e5d8c5] bg-white hover:border-[#c49b67]'}`}>
              <div className="relative aspect-[1/1.02] overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#324a42,#0b1820_74%)] p-2">
                {previews[design.designKey] ? (
                  <img src={previews[design.designKey]} alt={`${design.name} fully grown with 50 sample friends`}
                    className="h-full w-full object-contain drop-shadow-[0_5px_17px_rgba(244,181,82,0.35)]" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-[#f7e8d2]/80">
                    <span aria-hidden="true" className="text-4xl text-[#efc27c]">✺</span>
                    <span className="max-w-32 text-[11px] leading-4">
                      {failed.includes(design.designKey) ? 'Preview temporarily unavailable' : 'Preparing full-bloom view…'}
                    </span>
                  </div>
                )}
                {isSelected && <span className="absolute right-2 top-2 rounded-full bg-[#91222c] px-2.5 py-1 text-[10px] font-bold text-white">Selected ✓</span>}
              </div>
              <div className="p-3">
                <span className="block truncate font-serif text-base font-semibold text-[#26352c]">{design.name}</span>
                <span className="mt-2 flex gap-1" aria-hidden="true">
                  {palette?.colors.map((color, index) => (
                    <span key={index} className="h-3 w-3 rounded-full border border-black/10"
                      style={{backgroundColor:color}} />
                  ))}
                </span>
              </div>
            </button>
          )
        })}
      </div>
      {failed.length > 0 && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f6e8df] px-3 py-2 text-xs text-[#762f26]">
        <span>Some previews could not load. You can still select their design.</span>
        <button type="button" onClick={() => setRetry(x => x + 1)}
          className="rounded-lg border border-[#c49b67] px-3 py-2 font-bold">Retry previews</button>
      </div>}
    </div>
  )
}
