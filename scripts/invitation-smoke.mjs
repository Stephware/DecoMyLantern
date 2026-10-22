#!/usr/bin/env node
/**
 * DESTRUCTIVE development-only integration test.
 * Creates new owners and 51 guest contributions in a LOCAL SQL Server database.
 * Run only against a disposable, migrated dev instance: never production.
 * Usage from repo root: node scripts/invitation-smoke.mjs --confirm-dev-database
 */
import { strict as assert } from 'node:assert'

const base = process.env.BEMYPAROL_TEST_API ?? 'http://localhost:5050'
const parsed = new URL(base)
if (!['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname) ||
    !['http:', 'https:'].includes(parsed.protocol) ||
    !process.argv.includes('--confirm-dev-database')) {
  throw new Error('Refusing to write test contributions. Use localhost and --confirm-dev-database only.')
}

class Browser {
  constructor() { this.cookies = new Map() }

  async call(path, method = 'GET', body = undefined, csrfPath = undefined) {
    const headers = new Headers()
    if (body !== undefined) headers.set('Content-Type', 'application/json')
    if (csrfPath) {
      const csrf = await this.call(csrfPath)
      assert.equal(csrf.status, 200, 'CSRF initialization failed')
      headers.set('X-CSRF-TOKEN', csrf.data.token)
    }
    if (this.cookies.size) {
      headers.set('Cookie', [...this.cookies].map(([key, value]) => `${key}=${value}`).join('; '))
    }
    const response = await fetch(new URL(path, base), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual',
      cache: 'no-store',
    })
    for (const cookie of response.headers.getSetCookie()) {
      const [part] = cookie.split(';')
      const eq = part.indexOf('=')
      if (eq > 0) {
        const key = part.slice(0, eq)
        const value = part.slice(eq + 1)
        if (value) this.cookies.set(key, value)
        else this.cookies.delete(key)
      }
    }
    const raw = await response.text()
    let data = null
    try { data = raw ? JSON.parse(raw) : null } catch { data = raw }
    return { status: response.status, data }
  }

  ownerPost(path, body) { return this.call(path, 'POST', body, '/api/owner/csrf') }
  guestPost(path, body) { return this.call(path, 'POST', body, '/api/invitations/csrf') }
  ownerDelete(path) { return this.call(path, 'DELETE', undefined, '/api/owner/csrf') }
}

function ok(response, status, step) {
  assert.equal(response.status, status, `${step}: status ${response.status} ${JSON.stringify(response.data)}`)
  return response.data
}

const owner = new Browser()
const issuedOwner = ok(await owner.ownerPost('/api/owner/create'), 201, 'create owner')
assert.equal(issuedOwner.recoveryCode.length, 22)
const lantern = ok(await owner.call('/api/my/lantern'), 200, 'get owner parol')
assert.equal(lantern.acceptedFriends, 0)

const invitation = ok(await owner.ownerPost('/api/my/lantern/invitations'), 200, 'official invite')
assert.equal(invitation.token.length, 16)
const sameInvitation = ok(await owner.ownerPost('/api/my/lantern/invitations'), 200, 'reload same invite')
assert.equal(sameInvitation.token, invitation.token)
assert.equal(sameInvitation.id, invitation.id)

const ownLight = await owner.guestPost('/api/invitations/contribute', {
  token: invitation.token,
  displayName: 'The parol owner',
  message: 'Should not be accepted',
})
assert.equal(ownLight.status, 409, 'owner cannot add a guest light to their own parol')
assert.equal(ok(await owner.call('/api/my/lantern'), 200, 'after self contribution').acceptedFriends, 0)

const guests = []
async function friend(number) {
  const guest = new Browser()
  const preview = ok(
    await guest.guestPost('/api/invitations/preview', { token: invitation.token }),
    200, `friend ${number} preview`)
  assert.equal(preview.alreadyContributed, false)
  assert.equal(preview.lights.length, number - 1)
  assert.ok(!JSON.stringify(preview).includes('recoveryCode'))
  assert.ok(!JSON.stringify(preview).includes('body'))

  const contribution = ok(
    await guest.guestPost('/api/invitations/contribute', {
      token: invitation.token,
      displayName: `Guest ${number}`,
      message: number === 1 ? 'A private Christmas wish' : '',
    }),
    201, `friend ${number} contribution`)
  assert.equal(contribution.parol.alreadyContributed, true)
  assert.equal(contribution.parol.acceptedFriends, number)
  assert.equal(contribution.slotIndex, number - 1)
  guests.push(guest)
}

for (let n = 1; n <= 49; n++) await friend(n)

const concurrent = [new Browser(), new Browser()]
const both = await Promise.all(concurrent.map((guest, i) =>
  guest.guestPost('/api/invitations/contribute', {
    token: invitation.token,
    displayName: `Concurrent guest ${i + 1}`,
    message: 'Happy Pasko!',
  })))
both.forEach((response, i) => ok(response, 201, `concurrent guest ${i + 1}`))
assert.deepEqual(both.map(x => x.data.slotIndex).sort((a,b)=>a-b), [49, 50])
assert.ok(both.every(x => x.data.parol.acceptedFriends >= 50 && x.data.parol.acceptedFriends <= 51), 'concurrent previews show final or near-final count')

const after = ok(await owner.call('/api/my/lantern'), 200, 'owner sees 51 lights')
assert.equal(after.acceptedFriends, 51)
assert.equal(after.lights.length, 51)
assert.equal(new Set(after.lights.map(x => x.slotIndex)).size, 51)
assert.deepEqual(after.lights.map(x => x.slotIndex), Array.from({ length: 51 }, (_, i) => i))
assert.equal(after.growthStage, 'sampaguita')

const duplicate = await guests[0].guestPost('/api/invitations/contribute', {
  token: invitation.token,
  displayName: 'Duplicate attempt',
  message: 'Duplicate message',
})
assert.equal(duplicate.status, 409, 'duplicate browser contribution rejected')
const still51 = ok(await owner.call('/api/my/lantern'), 200, 'count after duplicate')
assert.equal(still51.acceptedFriends, 51)

const secondOwner = new Browser()
ok(await secondOwner.ownerPost('/api/owner/create'), 201, 'create second owner')

const secondInvite = ok(await secondOwner.ownerPost('/api/my/lantern/invitations'), 200, 'second owner invitation')
const firstOwnerAsFriend = ok(
  await owner.guestPost('/api/invitations/contribute', {
    token: secondInvite.token,
    displayName: 'A friend who also owns a parol',
    message: '',
  }), 201, 'owner contributes to a friend parol')
assert.equal(firstOwnerAsFriend.parol.acceptedFriends, 1)
const secondInviteAgain = ok(await secondOwner.ownerPost('/api/my/lantern/invitations'), 200, 'retrieve second invite')
assert.equal(secondInvite.token, secondInviteAgain.token)
assert.notEqual(invitation.token, secondInvite.token)

const inbox = ok(await owner.call(`/api/my/lanterns/${lantern.id}/messages`), 200, 'owner inbox')
if (!inbox.unlocked) {
  assert.ok(inbox.messages.length >= 1)
  assert.ok(inbox.messages.every(letter => letter.body === null), 'no early Christmas message text')
}
const guestInbox = await guests[0].call(`/api/my/lanterns/${lantern.id}/messages`)
assert.equal(guestInbox.status, 401, 'guest never receives owner inbox')

const recoveredBrowser = new Browser()
const recovered = ok(await recoveredBrowser.ownerPost('/api/owner/recover', {
  recoveryCode: issuedOwner.recoveryCode,
}), 200, 'first recovery')
assert.equal(recovered.owner.id, issuedOwner.owner.id)
const recoveredAgain = new Browser()
const secondRecovery = ok(await recoveredAgain.ownerPost('/api/owner/recover', {
  recoveryCode: issuedOwner.recoveryCode,
}), 200, 'same recovery key works again')
assert.equal(secondRecovery.owner.id, issuedOwner.owner.id)
assert.equal(ok(await recoveredAgain.ownerPost('/api/my/lantern/invitations'), 200,
  'link survives recovery').token, invitation.token)
assert.equal(ok(await recoveredAgain.call('/api/my/lantern'), 200, 'retained lights').acceptedFriends, 51)

console.log('PASS: one 16-character invitation reused across sessions and devices,')
console.log('49 sequential + 2 concurrent guests (51 total), unique slots,')
console.log('duplicate rejection, owner isolation, inbox redaction, and reusable recovery key.')
console.log('All records were inserted into your disposable LOCAL development database.')
