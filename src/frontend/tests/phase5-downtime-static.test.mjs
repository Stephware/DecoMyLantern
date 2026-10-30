import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const page = readFileSync(new URL('../../../downtime/index.html', import.meta.url), 'utf8')

test('downtime page is a single standalone HTML file, not the React entrypoint', () => {
  assert.match(page, /^<!doctype html>\s*<html lang="en">/i)
  assert.match(page, /<title>We'll shine again \| BeMyParol<\/title>/)
  assert.match(page, /<style>[\s\S]*<\/style>/)
  assert.match(page, /<body>[\s\S]*<main class="wrap">/)
  assert.doesNotMatch(page, /<div id="root"|type="module"/i)
})

test('downtime experience never depends on remote or app resources', () => {
  assert.doesNotMatch(page, /<(?:script|link|img|iframe|object|video|audio)\b/i)
  // Internal SVG gradients use url(#id); these are self-contained, not external.
  const externalCSS = page.replace(/url\(#[-a-z0-9]+\)/gi, '')
  assert.doesNotMatch(externalCSS, /@import|@font-face|url\s*\(|fetch\s*\(|XMLHttpRequest/i)
  for (const [, id] of page.matchAll(/url\(#([-a-z0-9]+)\)/gi)) {
    assert.ok(page.includes(`id="${id}"`), `missing inline SVG paint server: ${id}`)
  }
  assert.doesNotMatch(page.replace('xmlns="http://www.w3.org/2000/svg"', ''), /https?:\/\//i)
})

test('page has responsive mobile layout, accessible messaging, and meaningful retry', () => {
  assert.match(page, /<meta name="viewport" content="width=device-width, initial-scale=1">/)
  assert.match(page, /@media \(max-width: 760px\)/)
  assert.match(page, /@media \(max-width: 390px\)/)
  assert.match(page, /<section class="panel" aria-labelledby="downtime-heading">/)
  assert.match(page, /<h1 id="downtime-heading">/)
  assert.match(page, /temporarily unavailable/i)
  assert.match(page, /<a class="retry" href="\/">Try again<\/a>/)
  assert.match(page, /<meta name="robots" content="noindex, nofollow">/)
  assert.doesNotMatch(page, /refresh" content=|setTimeout|setInterval|auto-refresh/i)
})

test('downtime art uses actual approved Classic Gold parol instead of an invented petal icon', () => {
  const core = readFileSync(
    new URL('../src/features/lantern/renderer/ParolArtwork.tsx', import.meta.url), 'utf8')
  const shell = readFileSync(
    new URL('../src/features/lantern/renderer/ProceduralOuterShell.tsx', import.meta.url), 'utf8')
  const growth = readFileSync(
    new URL('../src/features/lantern/growth/outerGrowth.ts', import.meta.url), 'utf8')
  const themes = readFileSync(
    new URL('../src/features/customization/themes.ts', import.meta.url), 'utf8')
  assert.match(page, /<svg[^>]*viewBox="0 0 600 640" role="img"/)
  assert.match(page, /<title id="parol-title">BeMyParol Classic Gold parol<\/title>/)
  assert.match(page, /data-design="classic" data-friends="0"/)
  assert.match(page, /data-part="living-outer-shell"/)
  assert.match(page, /data-part="festival-mini-parol"/)
  assert.match(core, /length: 20 \}, \(_, sector\)/)
  assert.match(shell, /festivalOutlinePath\(growthCount\)/)
  assert.match(growth, /BASE_FESTIVAL_RADIUS = 164/)
  assert.match(themes, /key: 'classic', label: 'Classic Gold', colors: \['#f8cc6f', '#ffefc5', '#bb404d', '#397867'\]/)
  for (const color of ['#f8cc6f', '#ffefc5', '#bb404d', '#397867']) {
    assert.ok(page.includes(color), `missing canonical theme color ${color}`)
  }
  assert.match(page, /d="M 289 164 L 300 146 L 311 164/)
  assert.match(page, /d="M 300 196 L 319 216 L 300 247/)
  assert.match(page, /d="M 284 248 Q 276 229 300 208/)
  assert.equal((page.match(/<g transform="rotate\(\d+ 300 302\)"/g) ?? []).length, 50)
  assert.equal((page.match(/<\/g>/g) ?? []).length, 52)
  assert.match(page, /<polygon points="/)
  assert.doesNotMatch(page, /<animate\b|<animateTransform\b|<foreignObject\b|<script\b/i)
})

test('Filipino gratitude is shown as requested', () => {
  assert.match(page, /Salamat sa pasensya ✦/)
  assert.doesNotMatch(page, /Salamat for your patience/)
})

test('no infrastructure, ads, customer information, or error details are embedded', () => {
  assert.doesNotMatch(page, /cloudflare|cloudflared|hosthatch|adsbygoogle|googlesyndication/i)
  assert.doesNotMatch(page, /api\/|database|recovery key|invite token|stack trace/i)
  assert.doesNotMatch(page, /deploy(?:ment)? at|will be live at|within \d+ minutes/i)
})
