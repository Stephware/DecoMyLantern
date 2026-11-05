import {test} from 'node:test'
import assert from 'node:assert/strict'
import * as spec from '../src/features/story/storySpec.ts'

test('original standard and high presets retain an eight-second timeline', () => {
  assert.deepEqual(spec.STORY_PRESETS, {
    standard: {width:720,height:1280,fps:24},
    high: {width:1080,height:1920,fps:30},
  })
  assert.equal(spec.STORY_DURATION,8)
  for (const fps of [24,30]) {
    for (const friends of [0,1,12,50,500]) {
      const full=Math.min(friends,50)*3
      const prior=Math.max(0,full-3)
      for (const [seconds,stage] of [[0,0],[1,1],[2,2],[3,3],[7,3]])
        assert.equal(spec.storyGrowthAtFrame(friends,seconds*fps,fps),Math.min(full,prior+stage))
    }
  }
})
