import type {ChristmasInbox} from '../../lib/api'

export function christmasRevealStorageKey(lanternId: string, seasonYear: number): string {
  return `bemyparol:christmas-reveal:v1:${lanternId}:${seasonYear}`
}

/** Only a server-confirmed real Christmas day can trigger normal owners.
 * Admin early unlock is purposely NOT sufficient for automatic display. */
export function shouldAutoReveal(inbox: ChristmasInbox, seen: boolean): boolean {
  return inbox.unlocked && inbox.christmasDayReached && !seen
}

export function canPreviewEarly(isAdmin: boolean, inbox: ChristmasInbox): boolean {
  return isAdmin && inbox.unlocked
}
