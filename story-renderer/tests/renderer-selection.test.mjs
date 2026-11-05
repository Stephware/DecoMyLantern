import {test} from 'node:test'
import assert from 'node:assert/strict'
import {selectRenderer} from '../rendererSelection.mjs'

test('MP4 uses FFmpeg only when enabled with a verified asset', () => {
  assert.equal(selectRenderer('mp4', 'ffmpeg', true), 'ffmpeg')
  assert.equal(selectRenderer('mp4', 'ffmpeg', false), 'remotion')
  assert.equal(selectRenderer('mp4', 'remotion', true), 'remotion')
  assert.equal(selectRenderer('png', 'ffmpeg', true), 'remotion')
})
