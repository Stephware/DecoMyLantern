/**
 * Lightweight, abortable frontend retry policy for protected media exports.
 * This is not an external rendering queue or a server-side cancellation API.
 */
export function retryableMediaError(error: unknown, retriesUsed: number): boolean {
  if (retriesUsed >= 2 || !(error instanceof Error) || !('status' in error)) return false
  return error.status === 503 || error.status === 504
}

function cancelled(): DOMException {
  return new DOMException('Media preparation cancelled.', 'AbortError')
}

export function waitBeforeMediaRetry(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(cancelled())
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
      reject(cancelled())
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal.addEventListener('abort', onAbort, {once: true})
  })
}

export async function prepareMediaWithRetry(
  render: () => Promise<Blob>,
  signal: AbortSignal,
  onRetry: (retryNumber: number) => void = () => {},
  retryDelayMs = 1500,
): Promise<Blob> {
  for (let retriesUsed = 0; retriesUsed <= 2; retriesUsed++) {
    if (signal.aborted) throw cancelled()
    try {
      const blob = await render()
      if (signal.aborted) throw cancelled()
      return blob
    } catch (caught) {
      if (signal.aborted) throw cancelled()
      if (!retryableMediaError(caught, retriesUsed)) throw caught
      onRetry(retriesUsed + 1)
      await waitBeforeMediaRetry((retriesUsed + 1) * retryDelayMs, signal)
    }
  }
  throw new Error('Media preparation did not complete.')
}
