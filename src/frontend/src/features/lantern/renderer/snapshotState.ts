/**
 * Detects when a real saved parol needs a fresh server-generated image.
 * Sorting means harmless response reordering does not trigger another render.
 * The invitation stays only in memory and is never embedded in an image URL.
 */
export function snapshotRequestKey(
  source: {kind: 'owner' | 'guest'; stateId: string; token?: string},
  designKey: string, patternKey: string, friendCount: number,
  slots: readonly number[],
): string {
  return JSON.stringify([
    source.kind, source.stateId, source.token ?? '',
    designKey, patternKey, friendCount, [...slots].sort((a, b) => a - b),
  ])
}
