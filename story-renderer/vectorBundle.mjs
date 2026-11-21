import {build} from 'esbuild'
import {mkdir} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const directory = path.dirname(fileURLToPath(import.meta.url))
const outputDir = path.join(directory, '.generated')
await mkdir(outputDir, {recursive:true})
await build({entryPoints:[path.join(directory, 'vectorEntry.tsx')],
  outfile:path.join(outputDir, 'vector.mjs'),bundle:true,platform:'node',format:'esm',
  packages:'external',jsx:'automatic',logLevel:'warning'})
