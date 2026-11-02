import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read = path => readFileSync(new URL('../src/' + path, import.meta.url), 'utf8')
const guest = read('features/invitations/GuestInvitationPage.tsx')

test('after a successful or earlier contribution, only create-own-parol is the next-step action', () => {
  assert.ok(guest.includes('const alreadyContributed = submitted || preview?.alreadyContributed === true'))
  const start = guest.indexOf('{alreadyContributed ? (')
  const end = guest.indexOf(') : (', start)
  assert.ok(start >= 0 && end > start, 'post-contribution branch must exist')
  const completed = guest.slice(start, end)
  assert.ok(completed.includes('Your light is shining!'))
  assert.ok(completed.includes('Your light is already here!'))
  assert.ok(completed.includes('Your Christmas message stays private until December 25.'))
  assert.match(completed, /<a href="\/"[^>]*>\s*Create my own parol →\s*<\/a>/)
  assert.equal((completed.match(/<a\s/g) ?? []).length, 1)
  assert.doesNotMatch(completed, /<button\b|StoryShare|share\(|copyLink\(|Download MP4|Download PNG|Copy invitation link/)
})

test('friend screen does not mount sharing controls or prepare media', () => {
  assert.doesNotMatch(guest, /import StoryShare|<StoryShare|invitationUrl\(|exportStoryMedia\(|exportParolImage\(|ownSlot|setOwnSlot/)
  const ownerSharing = read('features/invitations/InvitationManager.tsx')
  assert.match(ownerSharing, /<StoryShare/)
})

test('friend contribution and saved parol preview remain unchanged', () => {
  assert.ok(guest.includes('await contributeInvitation(token, name.trim(), message.trim())'))
  assert.ok(guest.includes('setPreview(result.parol)'))
  assert.ok(guest.includes('setSubmitted(true)'))
  assert.ok(guest.includes('setMessage(\'\')'))
  assert.ok(guest.includes('previewInvitation(token)'))
  assert.ok(guest.includes('snapshot={{kind:\'guest\',stateId:token,token}}'))
  assert.ok(guest.includes('No account needed. One light per browser.'))
  assert.ok(guest.includes('Share my light ✦'))
})
