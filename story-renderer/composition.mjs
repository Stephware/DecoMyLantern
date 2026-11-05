import crypto from 'node:crypto'

export const TEMPLATE_VERSION = 'story-hybrid-v2'
export const PRESETS = Object.freeze({
  standard: Object.freeze({width:720,height:1280,fps:24,frames:192,duration:8,
    codec:'libx264',pixelFormat:'yuv420p',crf:24,preset:'veryfast',audio:null}),
  high: Object.freeze({width:1080,height:1920,fps:30,frames:240,duration:8,
    codec:'libx264',pixelFormat:'yuv420p',crf:24,preset:'veryfast',audio:null}),
})
export const OUTPUT = PRESETS.standard
export const STAGES = Object.freeze([0,1,2,3])
export const FLASHES = Object.freeze([1,2,3])
export const TIMING = Object.freeze({growthStages:STAGES,flashes:FLASHES,
  flashDuration:25/30,parolFade:[4/30,26/30],textFade:[155/30,181/30],
  zoom:{from:1.12,to:1,start:96/30,end:151/30},parolCenterY:770/1920})
export const frameAt = (seconds, output = OUTPUT) => Math.round(seconds * output.fps)

export function compositionFor(input, preset = 'standard') {
  const {kind, designKey, patternKey, friendCount, slots, highlightSlot} = input
  if (!(preset in PRESETS)) throw new RangeError('Unknown Story preset')
  return {
    template: {id: 'BeMyParolStory', version: TEMPLATE_VERSION},
    // Slot order is preserved because SVG paint order can affect overlapping lights.
    design: {kind, designKey, patternKey, friendCount,
      slots: [...slots], highlightSlot},
    output: PRESETS[preset],
    timing: TIMING,
    layers: [
      {id: 'background', source: `generated/${preset}/background.mp4`, reusable: true},
      {id: 'parol', source: 'personalized growth-stage PNGs', reusable: false, stages: STAGES},
      {id: 'flash', source: 'derived from parol stage alpha', reusable: false, stages: FLASHES},
      {id: 'text', source: 'template typography', reusable: false},
    ],
    audio: null,
  }
}

export function renderDigest(composition, sourceDigest, assetDigest, renderer) {
  return crypto.createHash('sha256').update(JSON.stringify({composition,
    sourceDigest, assetDigest, renderer})).digest('hex')
}
