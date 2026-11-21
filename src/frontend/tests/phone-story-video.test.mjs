import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')

test('device MP4 exports delegate to the original Remotion browser renderer', () => {
  const source = read('src/features/story/phoneStoryVideo.ts')
  assert.match(source, /renderStoryInBrowser/)
  assert.doesNotMatch(source, /CanvasSource|canEncodeVideo|mediabunny/)
  const browser = read('src/features/story/browserRenderer.tsx')
  assert.match(browser, /renderMediaOnWeb/)
  assert.match(browser, /mediaCacheSizeInBytes:32\*1024\*1024/)
  assert.match(browser, /validateBrowserVideo/)
  assert.match(browser, /crypto\.subtle\.digest/)
})

test('safe device MP4 support is probed at runtime and limited by parol size', () => {
  const device = read('src/features/story/phoneStoryVideo.ts')
  const share = read('src/features/story/StoryShare.tsx')
  assert.match(device, /export async function canRenderStoryOnDevice/)
  assert.match(device, /deviceVideoFriendLimit/)
  assert.ok(device.includes('(friendCount ?? 0) > deviceVideoFriendLimit()'))
  assert.ok(device.includes('(slotCount ?? 0) > deviceVideoFriendLimit()'))
  assert.match(device, /browserCanRenderStory/)
  assert.match(share, /module\.canRenderStoryOnDevice\(data\.friendCount, data\.slots\.length\)/)
  assert.match(share, /Generate on this device/)
  assert.match(share, /Generate in background instead/)
  assert.match(share, /const job = await startOwnerVideoJob\(controller\.signal\)/)
  assert.match(share, /deviceFailed = true/)
  assert.match(share, /request\.mode = 'server'/)
  assert.match(share, /getOwnerVideoJobStatus\(controller\.signal\)/)
  assert.match(share, /getOwnerVideoJobFile\(controller\.signal\)/)
  assert.doesNotMatch(share, /Generate on this phone/)
})

test('PNG and MP4 both run locally first, preserving server fallback for owner and guests', () => {
  const device = read('src/features/story/phoneStoryVideo.ts')
  const share = read('src/features/story/StoryShare.tsx')
  assert.match(device, /export async function renderStoryImageOnDevice/)
  assert.match(device, /verifyFramePainting\(canvas, data, signal\)/)
  assert.match(device, /canvas\.toBlob\(/)
  assert.match(device, /'image\/png'/)
  assert.match(device, /const signature = new Uint8Array/)
  assert.match(device, /export async function renderStoryOnDevice/)
  assert.match(share, /selected === 'png' \|\| \(selected === 'mp4' && deviceAvailable\)/)
  assert.match(share, /renderStoryImageOnDevice\(composition, controller\.signal\)/)
  assert.match(share, /renderStoryOnDevice\(composition, controller\.signal/)
  assert.match(share, /setPng\(blob\)/)
  assert.match(share, /setVideo\(blob\)/)
  assert.match(share, /exportStoryMedia\(data\.kind, 'png', token, controller\.signal\)/)
  assert.match(share, /exportStoryMedia\(data\.kind, 'mp4', token, controller\.signal\)/)
  assert.match(share, /data\.kind === 'owner'/)
  assert.match(share, /latestDataKey\.current !== requestedKey/)
})

test('device renderer is bounded, cancelable, validates frames and never runs hidden', () => {
  const device = read('src/features/story/phoneStoryVideo.ts')
  const share = read('src/features/story/StoryShare.tsx')
  assert.match(device, /signal\.aborted \|\| document\.hidden/)
  assert.match(device, /image\.decode\(\)/)
  assert.match(device, /getImageData\(/)
  assert.match(device, /URL\.revokeObjectURL\(blobUrl\)/)
  assert.match(share, /current\.controller\.abort\(\)/)
  assert.match(share, /Device generation stopped/)
  assert.match(share, /Keep this page open/)
  assert.match(share, /latestDataKey\.current !== requestedKey/)
})

test('original Remotion dependencies are pinned; server, share/download and zoom stay independent', () => {
  const packageJson = JSON.parse(read('package.json'))
  const lock = JSON.parse(read('package-lock.json'))
  const share = read('src/features/story/StoryShare.tsx')
  const guest = read('src/features/invitations/GuestInvitationPage.tsx')
  for (const name of ['remotion', '@remotion/web-renderer']) {
    assert.equal(packageJson.dependencies[name], '4.0.537')
    assert.equal(lock.packages[''].dependencies[name], '4.0.537')
    assert.equal(lock.packages['node_modules/' + name].version, '4.0.537')
  }
  assert.equal(packageJson.dependencies.mediabunny, undefined)
  assert.ok(!guest.includes('<StoryShare'))
  assert.match(share, /Download MP4/)
  assert.match(share, /Download PNG/)
  assert.match(share, /Share video/)
  assert.match(share, /Share image/)
})


test('local painting preserves high-resolution PNG and authoritative saved composition', () => {
  const device = read('src/features/story/phoneStoryVideo.ts')
  const share = read('src/features/story/StoryShare.tsx')
  assert.match(device, /preset: 'high'/)
  assert.match(device, /STORY_PRESETS.high/)
  assert.match(share, /fetchStoryComposition\(data.kind, token, controller.signal\)/)
  assert.match(share, /frame=\{200\} preset="high"/)
})
