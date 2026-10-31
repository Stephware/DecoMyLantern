import crypto from 'node:crypto'

export const TEMPLATE_VERSION = 'story-ffmpeg-v1'
export const OUTPUT = Object.freeze({width: 1080, height: 1920, fps: 30, frames: 240,
  codec: 'libx264', pixelFormat: 'yuv420p', crf: 24, preset: 'veryfast', audio: null})
export const STAGES = Object.freeze([0, 30, 60, 90])
export const FLASHES = Object.freeze([30, 60, 90])

export function compositionFor(input) {
  const {kind, designKey, patternKey, friendCount, slots, highlightSlot} = input
  return {
    template: {id: 'BeMyParolStory', version: TEMPLATE_VERSION},
    // Slot order is preserved because SVG paint order can affect overlapping lights.
    design: {kind, designKey, patternKey, friendCount,
      slots: [...slots], highlightSlot},
    output: OUTPUT,
    timing: {growthStages: STAGES, flashes: FLASHES, parolFade: [4, 26],
      textFade: [155, 181], zoom: {from: 1.12, to: 1, start: 96, end: 151}},
    layers: [
      {id: 'background', source: 'generated/background.mp4', reusable: true},
      {id: 'parol', source: 'per-design PNGs', reusable: false, stages: STAGES},
      {id: 'flash', source: 'per-design PNGs', reusable: false, stages: FLASHES},
      {id: 'text', source: 'per-design PNG', reusable: false},
    ],
    audio: null,
  }
}

export function renderDigest(composition, sourceDigest, assetDigest, renderer) {
  return crypto.createHash('sha256').update(JSON.stringify({composition,
    sourceDigest, assetDigest, renderer})).digest('hex')
}
