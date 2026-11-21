import {readdir, stat, rm} from 'node:fs/promises'
import path from 'node:path'

export const CACHE_AGE_MS = 24 * 60 * 60 * 1000

export async function cachedExport(file, now = Date.now()) {
  const info = await stat(file).catch(() => null)
  return !!(info?.isFile() && info.size > 1024 && now - info.mtimeMs < CACHE_AGE_MS)
}

export async function pruneExports(directory, {now = Date.now(), limit = 32,
  removeAbandoned = false} = {}) {
  const keep = []
  for (const name of await readdir(directory)) {
    const file = path.join(directory, name)
    const info = await stat(file).catch(() => null)
    if (!info) continue
    // A new request may create a job directory while a prior request prunes.
    // Active jobs have a deadline under ten minutes, so one hour is safe.
    if (info.isDirectory()) {
      if (removeAbandoned || now - info.mtimeMs > 60 * 60 * 1000)
        await rm(file, {recursive:true, force:true})
      continue
    }
    if (now - info.mtimeMs > CACHE_AGE_MS || !info.isFile())
      await rm(file, {recursive:true, force:true})
    else keep.push({file, mtime:info.mtimeMs})
  }
  for (const item of keep.sort((a,b)=>b.mtime-a.mtime).slice(limit))
    await rm(item.file, {force:true})
}
