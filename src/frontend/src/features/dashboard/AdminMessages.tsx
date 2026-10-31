import { useEffect, useState } from 'react'
import { getLanternMessages, type ChristmasInbox } from '../../lib/api'

export default function AdminMessages({ lanternId, friendCount }: { lanternId: string; friendCount: number }) {
  const [inbox, setInbox] = useState<ChristmasInbox | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let active = true
    void getLanternMessages(lanternId).then(result => {
      if (active) { setInbox(result); setError('') }
    }).catch(caught => {
      if (active) setError(caught instanceof Error ? caught.message : 'Unable to load messages.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [lanternId, friendCount, refresh])

  return <section className="rounded-[24px] border border-[#d4bc91] bg-[#fffdf8] p-5 shadow-[0_10px_30px_rgba(57,43,27,.05)]" aria-label="Admin message inbox">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#926c39]">Admin only</p>
        <h3 className="mt-1 font-serif text-xl text-[#283a30]">Message inbox</h3>
      </div>
      <button type="button" onClick={() => { setLoading(true); setRefresh(value => value + 1) }}
        disabled={loading} className="rounded-full border border-[#d5c3a5] px-4 py-2 text-xs font-semibold text-[#74523b] disabled:opacity-50">
        Refresh messages
      </button>
    </div>
    <p className="mt-2 text-xs leading-5 text-[#766b5d]">Messages on this parol are available early for debugging.</p>
    {loading && <p role="status" className="mt-4 text-sm text-[#766b5d]">Loading messages…</p>}
    {error && <p role="alert" className="mt-4 text-sm text-[#902632]">{error}</p>}
    {!loading && !error && inbox && (inbox.messages.length ?
      <ul className="mt-4 space-y-3">{inbox.messages.map(letter => <li key={letter.id}
        className="rounded-xl border border-[#e6dccc] bg-[#f8f2e9] p-4">
        <div className="flex flex-wrap justify-between gap-2 text-xs text-[#746858]">
          <span className="font-semibold text-[#334538]">{letter.displayName}</span>
          <time dateTime={letter.createdAtUtc}>{new Date(letter.createdAtUtc).toLocaleString('en-PH')}</time>
        </div>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#354338]">
          {letter.isLocked ? 'This message is still locked.' : letter.body}
        </p>
      </li>)}</ul> : <p className="mt-4 text-sm text-[#766b5d]">No messages yet.</p>)}
  </section>
}
