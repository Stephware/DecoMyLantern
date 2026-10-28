import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  STORY_FPS, STORY_FRAMES, STORY_WIDTH, STORY_HEIGHT,
  storyGrowthAtFrame,
} from '../src/features/story/storySpec.ts'

test('MP4 exports are eight-second vertical Stories', () => {
  assert.equal(STORY_WIDTH,1080)
  assert.equal(STORY_HEIGHT,1920)
  assert.equal(STORY_FPS,30)
  assert.equal(STORY_FRAMES,240)
  assert.equal(STORY_FRAMES/STORY_FPS,8)
})

test('each Story reveals one real friend as three entire growth waves',()=>{
  for (const friends of [0,1,2,17,50]) {
    const final = Math.max(0,friends*3)
    assert.deepEqual(
      [0,30,60,90,200].map(frame=>storyGrowthAtFrame(friends,frame)),
      [Math.max(0,final-3),Math.min(final,Math.max(0,final-3)+1),
       Math.min(final,Math.max(0,final-3)+2),final,final]
    )
  }
  assert.equal(storyGrowthAtFrame(51,200),150)
  assert.throws(()=>storyGrowthAtFrame(-1,5),RangeError)
})

test('owner and guest sharing is present without requesting a Meta account',()=>{
  const path=new URL('../src/features/story/StoryShare.tsx',import.meta.url)
  const code=readFileSync(path,'utf8')
  assert.ok(code.includes('navigator.share'))
  assert.ok(code.includes('navigator.canShare'))
  assert.ok(code.includes('Download MP4'))
  assert.ok(code.includes('Copy invitation link'))
  assert.ok(code.includes("generate('png')"))
  assert.ok(!code.includes('instagramAccessToken'))
})
