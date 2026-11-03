import {useEffect, useMemo, useState} from 'react'
import type {Theme} from '../../customization/themes'
import CachedParolScene from './CachedParolScene'

type Props = {
  lanternId: string
  theme: Theme
  pattern: string
  friendCount: number
}

/**
 * Admin Design Lab only. Synthetic counts never touch the saved parol, but
 * their images share the same private 1x/2x/3x content-addressed renderer.
 * Debouncing keeps rapidly selected test counts from queuing cold renders.
 */
export default function AdminCachedParolPreview({
  lanternId, theme, pattern, friendCount,
}: Props) {
  const [selection, setSelection] = useState({theme, pattern, friendCount})
  useEffect(() => {
    const timer = window.setTimeout(() => setSelection({theme, pattern, friendCount}), 300)
    return () => window.clearTimeout(timer)
  }, [theme, pattern, friendCount])

  const sampleLights = useMemo(() =>
    Array.from({length:selection.friendCount}, (_, index) => ({
      id: `admin-sample-${index}`, slotIndex:index,
      displayName:`Sample light ${index + 1}`,
    })), [selection.friendCount])

  return <>
    <CachedParolScene
      theme={selection.theme} pattern={selection.pattern}
      contributions={sampleLights} friendCount={selection.friendCount}
      snapshot={{kind:'owner', stateId:lanternId}} adminPreview
    />
    <p className="mt-2 text-center text-xs text-[#e4c99f]" role="status">
      {selection.friendCount} synthetic friends · Preview only · Nothing saved
    </p>
  </>
}
