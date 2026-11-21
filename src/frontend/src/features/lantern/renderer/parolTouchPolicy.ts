/**
 * Coarse-pointer devices use their usual browser scrolling/zoom gestures
 * until the user explicitly enters the immersive Explore parol viewer.
 * Mouse/trackpad viewers keep their existing pan and zoom controls.
 */
export function canPanParol(primaryPointerCoarse: boolean, exploring: boolean): boolean {
  return !primaryPointerCoarse || exploring
}
