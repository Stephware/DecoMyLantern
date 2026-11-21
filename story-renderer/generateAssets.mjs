import crypto from 'node:crypto'
import {readFile, writeFile, mkdir, rename, rm, copyFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {bundle} from '@remotion/bundler'
import {renderMedia, selectComposition} from '@remotion/renderer'
import {TEMPLATE_VERSION, OUTPUT} from './composition.mjs'

const directory = path.dirname(fileURLToPath(import.meta.url))
const assetDir = path.join(directory, 'assets', 'generated', 'standard')
await mkdir(assetDir, {recursive: true})
const final = path.join(assetDir, 'background.mp4')
const temporary = path.join(assetDir, `background.${crypto.randomUUID()}.tmp.mp4`)
const inputProps = {kind:'owner', designKey:'classic', patternKey:'default',
  friendCount:0, slots:[], highlightSlot:null, layer:'background'}
const backgroundSourceSha256 = crypto.createHash('sha256').update(await readFile(
  path.join(directory, '..', 'src', 'frontend', 'src', 'features', 'story', 'StoryFrame.tsx')))
  .digest('hex')
const nightSource = path.join(directory, '..', 'src', 'frontend', 'public', 'story-assets', 'story-night-v2.svg')
const nightBytes = await readFile(nightSource)
const nightSha256 = crypto.createHash('sha256').update(nightBytes).digest('hex')
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
  await copyFile(nightSource,path.join(assetDir,'story-night-v2.svg'))
  await writeFile(path.join(assetDir, 'manifest.json'), JSON.stringify({
    version:2,templateVersion:TEMPLATE_VERSION, assets:[{
      id:'story-background',file:'background.mp4',width:OUTPUT.width,height:OUTPUT.height,
      fps:OUTPUT.fps,duration:OUTPUT.duration,frames:OUTPUT.frames,
      sourceSha256:backgroundSourceSha256,sha256,
      compatibility:{codec:'h264',pixelFormat:'yuv420p',audio:false},
    },{
      id:'story-night',file:'story-night-v2.svg',width:1080,height:1920,
      fps:OUTPUT.fps,duration:OUTPUT.duration,sourceSha256:nightSha256,
      sha256:nightSha256,compatibility:{mime:'image/svg+xml',public:true},
    }],
  }, null, 2) + '\n')
  console.log(`Generated reusable Story background: ${bytes.length} bytes, sha256 ${sha256}`)
} finally { await rm(temporary, {force:true}) }
