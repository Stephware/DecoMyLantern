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
  assert.doesNotMatch(page, /@import|@font-face|url\s*\(|fetch\s*\(|XMLHttpRequest/i)
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

test('parol is self-contained accessible SVG without animation or a dangling tail', () => {
  assert.match(page, /<svg[^>]*viewBox="0 0 440 440" role="img"/)
  assert.match(page, /<title id="parol-title">A glowing Christmas parol<\/title>/)
  assert.match(page, /<desc id="parol-description">/)
  const petals = page.match(/<g transform="rotate\(/g) ?? []
  const closedGroups = page.match(/<\/g>/g) ?? []
  assert.equal(petals.length, 12)
  assert.equal(closedGroups.length, petals.length)
  assert.match(page, /<polygon points="/)
  assert.doesNotMatch(page, /<animate\b|<animateTransform\b|<foreignObject\b|<script\b/i)
})

test('no infrastructure, ads, customer information, or error details are embedded', () => {
  assert.doesNotMatch(page, /cloudflare|cloudflared|hosthatch|adsbygoogle|googlesyndication/i)
  assert.doesNotMatch(page, /api\/|database|recovery key|invite token|stack trace/i)
  assert.doesNotMatch(page, /deploy(?:ment)? at|will be live at|within \d+ minutes/i)
})
