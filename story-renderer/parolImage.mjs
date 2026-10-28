import crypto from 'node:crypto'

// Bump when changing ParolSnapshot's visual output. Old cached files then
// become unreachable; the existing 24-hour cleanup removes them later.
export const PAROL_IMAGE_VERSION = 'approved-parol-snapshot-v1'
export const PAROL_IMAGE_COMPOSITION = 'BeMyParolSnapshot'
export const PAROL_IMAGE_FORMATS = ['webp', 'png']

const designs = ['classic', 'floral', 'festival', 'celestial', 'fiesta', 'sampaguita']
const patterns = ['default', 'rings', 'rays']

export function validParolImage(input) {
  return input !== null && typeof input === 'object' &&
    designs.includes(input.designKey) &&
    patterns.includes(input.patternKey) &&
    PAROL_IMAGE_FORMATS.includes(input.format) &&
    Number.isSafeInteger(input.friendCount) &&
    input.friendCount >= 0 && input.friendCount <= 10000 &&
    Array.isArray(input.slots) && input.slots.length <= 500 &&
    input.slots.length <= input.friendCount &&
    input.slots.every(n => Number.isSafeInteger(n) && n >= 0 && n <= 100000) &&
    new Set(input.slots).size === input.slots.length
}

/** Content-addressed: owner and guest share the same asset for the same parol. */
export function parolImageDigest(input) {
  if (!validParolImage(input)) throw new TypeError('Invalid parol snapshot data')
  const canonical = {
    version: PAROL_IMAGE_VERSION,
    designKey: input.designKey,
    patternKey: input.patternKey,
    friendCount: input.friendCount,
    slots: [...input.slots].sort((a, b) => a - b),
    format: input.format,
  }
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex')
}
