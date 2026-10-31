import crypto from 'node:crypto'
import {readFile, writeFile, mkdir, rename, rm} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {bundle} from '@remotion/bundler'
import {renderMedia, selectComposition} from '@remotion/renderer'
import {TEMPLATE_VERSION, OUTPUT} from './composition.mjs'

const directory = path.dirname(fileURLToPath(import.meta.url))
const assetDir = path.join(directory, 'assets', 'generated')
await mkdir(assetDir, {recursive: true})
const final = path.join(assetDir, 'background.mp4')
const temporary = path.join(assetDir, `background.${crypto.randomUUID()}.tmp.mp4`)
const inputProps = {kind:'owner', designKey:'classic', patternKey:'default',
  friendCount:0, slots:[], highlightSlot:null, layer:'background'}
const backgroundSourceSha256 = crypto.createHash('sha256').update(await readFile(
  path.join(directory, '..', 'src', 'frontend', 'src', 'features', 'story', 'StoryFrame.tsx')))
  .digest('hex')
const serveUrl = await bundle({entryPoint: path.join(directory, 'remotionEntry.tsx'),
  webpackOverride: config => ({...config, resolve:{...config.resolve,
    modules:[path.join(directory, 'node_modules'), 'node_modules'],
    alias:{...config.resolve?.alias, react:path.join(directory, 'node_modules/react'),
      'react-dom':path.join(directory, 'node_modules/react-dom')}}})})
try {
  const composition = await selectComposition({serveUrl, id:'BeMyParolStoryLayer', inputProps})
  await renderMedia({composition, serveUrl, codec:'h264', outputLocation:temporary,
    inputProps, concurrency:1, crf:OUTPUT.crf, logLevel:'error',
    chromiumOptions:{enableMultiProcessOnLinux:true}})
  const bytes = await readFile(temporary)
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex')
  await rename(temporary, final)
  await writeFile(path.join(assetDir, 'manifest.json'), JSON.stringify({
    templateVersion:TEMPLATE_VERSION, width:OUTPUT.width, height:OUTPUT.height,
    fps:OUTPUT.fps, frames:OUTPUT.frames, backgroundSha256:sha256,
    backgroundSourceSha256}, null, 2) + '\n')
  console.log(`Generated reusable Story background: ${bytes.length} bytes, sha256 ${sha256}`)
} finally { await rm(temporary, {force:true}) }
