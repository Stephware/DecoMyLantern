import {bundle} from '@remotion/bundler'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'

const directory = path.dirname(fileURLToPath(import.meta.url))
const entryPoint = path.join(directory, 'remotionEntry.tsx')
const bundleDir = path.join(directory, 'dist')

console.log('Building Remotion bundle...')

// Clean previous build
await fs.rm(bundleDir, {recursive: true, force: true}).catch(() => {})
await fs.mkdir(bundleDir, {recursive: true})

// Bundle for production
const serveUrl = await bundle({
  entryPoint,
  webpackOverride: config => ({
    ...config,
    resolve: {
      ...config.resolve,
      modules: [path.join(directory, 'node_modules'), 'node_modules'],
      alias: {
        ...config.resolve?.alias,
        react: path.join(directory, 'node_modules/react'),
        'react-dom': path.join(directory, 'node_modules/react-dom'),
      },
    },
    mode: 'production',
  }),
  onProgress: info => {
    if (info.type === 'done') {
      console.log('Bundle completed:', info.path)
    }
  }
})

// Copy bundle to dist
await fs.cp(serveUrl, bundleDir, {recursive: true})

// Write a marker file with the bundle URL for server.mjs to read
const bundleInfo = {
  serveUrl: `file://${path.join(bundleDir, path.basename(serveUrl))}`,
  builtAt: new Date().toISOString()
}
await fs.writeFile(path.join(bundleDir, 'bundle-info.json'), JSON.stringify(bundleInfo, null, 2))

console.log('Build complete. Bundle available at:', bundleInfo.serveUrl)