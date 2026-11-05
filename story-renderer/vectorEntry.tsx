import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {StoryFrame, type StoryData} from '../src/frontend/src/features/story/StoryFrame'

// The same SVG tree used by the page and Remotion is rendered without Chromium.
// Its dimensions remain in the canonical 1080p coordinate space; sharp scales it.
export function renderVectorSvg(data: StoryData, frame: number, layer: 'parol' | 'flash', preset: 'standard' | 'high') {
  const html = renderToStaticMarkup(createElement(StoryFrame, {data, frame, layer, preset}))
  const start = html.indexOf('<svg ')
  const end = html.indexOf('</svg>', start)
  if (start < 0 || end < 0) throw new Error(`Missing ${layer} artwork`)
  const svg = html.slice(start, end + 6)
  return svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
}
