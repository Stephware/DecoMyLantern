import { useEffect, useRef, useState } from 'react'

const ADS_ENABLED = String(import.meta.env.VITE_ADS_ENABLED ?? 'true').toLowerCase() === 'true'

type AdSize = { key: string; width: number; height: number }
type AdWindow = Window & { atOptions?: { key: string; format: string; height: number; width: number; params: Record<string, never> } }

const rectangle: AdSize = { key: '599d4ded23fe410cb1949840bd5beddd', width: 300, height: 250 }
const mobileBanner: AdSize = { key: '4e17186102b460b506b11ce02dd6462d', width: 320, height: 50 }
const desktopBanner: AdSize = { key: '14451f8a0e84f7ce12447465e16d308a', width: 728, height: 90 }
const tallSideBanner: AdSize = { key: '843de97102598396689eb12f69038b91', width: 160, height: 600 }
const shortSideBanner: AdSize = { key: '3cbb9be300d203850ceaf3829edceb88', width: 160, height: 300 }
let adScriptQueue = Promise.resolve()

function useMedia(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])
  return matches
}

const useDesktop = () => useMedia('(min-width: 1024px)')
const useWideDesktop = () => useMedia('(min-width: 1700px)')

function AdLabel() {
  return <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-[.2em] text-[#9b8e7a]">Advertisement</p>
}

function FormatAd({ ad }: { ad: AdSize }) {
  const mount = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ADS_ENABLED) return
    const container = mount.current
    if (!container) return
    let active = true
    let script: HTMLScriptElement | undefined
    let finishLoad: (() => void) | undefined
    const adWindow = window as AdWindow
    // Every banner uses the same global atOptions. Load them one at a time so
    // a later placement cannot overwrite the configuration of an earlier one.
    adScriptQueue = adScriptQueue.then(() => new Promise<void>(resolve => {
      if (!active) { resolve(); return }
      adWindow.atOptions = { key: ad.key, format: 'iframe', height: ad.height, width: ad.width, params: {} }
      script = document.createElement('script')
      script.src = `https://bicea.org/22/${ad.key}`
      script.async = false
      let finished = false
      const finish = () => {
        if (finished) return
        finished = true
        window.clearTimeout(timeout)
        finishLoad = undefined
        resolve()
      }
      const timeout = window.setTimeout(finish, 8000)
      finishLoad = finish
      script.addEventListener('load', finish, { once: true })
      script.addEventListener('error', finish, { once: true })
      container.appendChild(script)
    }))
    return () => {
      active = false
      finishLoad?.()
      container.replaceChildren()
      if (adWindow.atOptions?.key === ad.key) delete adWindow.atOptions
    }
  }, [ad])
  return <div ref={mount} style={{ width: ad.width, minHeight: ad.height, maxWidth: '100%' }} />
}

export function NativeAd() {
  const mount = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ADS_ENABLED) return
    const container = mount.current
    if (!container) return
    const script = document.createElement('script')
    script.src = 'https://bicea.org/21/d6b3dfa8d2a4b5c5ffd1950174d77fce'
    script.async = true
    script.setAttribute('data-cfasync', 'false')
    container.appendChild(script)
    return () => { container.replaceChildren() }
  }, [])
  if (!ADS_ENABLED) return null
  return <aside className="mx-auto max-w-[900px] px-5 pb-8 sm:px-9" aria-label="Advertisement">
    <AdLabel />
    <div ref={mount} id="container-d6b3dfa8d2a4b5c5ffd1950174d77fce" className="min-h-[250px]" />
  </aside>
}

export function RectangleAd() {
  const desktop = useDesktop()
  const wide = useWideDesktop()
  if (!ADS_ENABLED || !desktop || wide) return null
  return <aside className="mx-auto w-full max-w-[300px] pt-3" aria-label="Advertisement">
    <AdLabel />
    <FormatAd ad={rectangle} />
  </aside>
}

export function DesktopSideAds() {
  const wide = useWideDesktop()
  if (!ADS_ENABLED || !wide) return null
  return <>
    <aside className="absolute top-[180px] z-10 w-[160px]" style={{ left: 'calc(50% - 790px)' }} aria-label="Advertisement">
      <AdLabel />
      <FormatAd ad={tallSideBanner} />
    </aside>
    <aside className="absolute top-[180px] z-10 w-[160px]" style={{ right: 'calc(50% - 790px)' }} aria-label="Advertisement">
      <AdLabel />
      <FormatAd ad={shortSideBanner} />
    </aside>
  </>
}

export function BannerAd() {
  const desktop = useDesktop()
  if (!ADS_ENABLED) return null
  const ad = desktop ? desktopBanner : mobileBanner
  return <aside className="relative left-1/2 w-screen max-w-[728px] -translate-x-1/2 pb-7" aria-label="Advertisement">
    <AdLabel />
    <div className="flex justify-center"><FormatAd ad={ad} /></div>
  </aside>
}

export function ContributionPopunder() {
  useEffect(() => {
    if (!ADS_ENABLED) return
    let script: HTMLScriptElement | undefined
    // Defer insertion so React's development-only effect replay does not load it twice.
    const timer = window.setTimeout(() => {
      script = document.createElement('script')
      script.src = 'https://afders.org/1/3c1d8ca167626e13da9ca2a5099154ae'
      script.setAttribute('data-cfasync', 'false')
      document.body.appendChild(script)
    }, 0)
    return () => {
      window.clearTimeout(timer)
      script?.remove()
    }
  }, [])
  return null
}

export function AdSenseLoader() {
  useEffect(() => {
    if (!ADS_ENABLED) return
    let script: HTMLScriptElement | undefined
    const timer = window.setTimeout(() => {
      script = document.createElement('script')
      script.async = true
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3769107910895759'
      script.crossOrigin = 'anonymous'
      document.head.appendChild(script)
    }, 0)
    return () => {
      window.clearTimeout(timer)
      script?.remove()
    }
  }, [])
  return null
}
