import {registerRoot, Composition, useCurrentFrame} from 'remotion'
import {StoryFrame, type StoryData, type StoryLayer} from '../src/frontend/src/features/story/StoryFrame'
import {ParolSnapshot, type ParolSnapshotData} from '../src/frontend/src/features/lantern/renderer/ParolSnapshot'
import {STORY_DURATION, STORY_PRESETS} from '../src/frontend/src/features/story/storySpec'

const initial: StoryData = {
  kind:'owner', designKey:'classic', patternKey:'default',
  friendCount:0, slots:[], highlightSlot:null,
}
const StoryVideo = (data: StoryData) => <StoryFrame data={data} frame={useCurrentFrame()}/>
const HighStoryVideo = (data: StoryData) => <StoryFrame data={data} frame={useCurrentFrame()} preset="high"/>
const Layer = (data: StoryData & {layer: StoryLayer; sourceFrame?: number}) =>
  <StoryFrame data={data} frame={data.sourceFrame ?? useCurrentFrame()} layer={data.layer}/>
const HighLayer = (data: StoryData & {layer: StoryLayer; sourceFrame?: number}) =>
  <StoryFrame data={data} frame={data.sourceFrame ?? useCurrentFrame()} layer={data.layer} preset="high"/>
const snapshotInitial: ParolSnapshotData = {
  designKey: 'classic', patternKey: 'default', friendCount: 0, slots: [],
}
const Root = () => (
  <>
    <Composition id="BeMyParolStory" component={StoryVideo} width={STORY_PRESETS.standard.width}
      height={STORY_PRESETS.standard.height} fps={STORY_PRESETS.standard.fps}
      durationInFrames={STORY_DURATION * STORY_PRESETS.standard.fps} defaultProps={initial}/>
    <Composition id="BeMyParolStoryHigh" component={HighStoryVideo} width={STORY_PRESETS.high.width}
      height={STORY_PRESETS.high.height} fps={STORY_PRESETS.high.fps}
      durationInFrames={STORY_DURATION * STORY_PRESETS.high.fps} defaultProps={initial}/>
    <Composition id="BeMyParolStoryLayer" component={Layer} width={STORY_PRESETS.standard.width}
      height={STORY_PRESETS.standard.height} fps={STORY_PRESETS.standard.fps}
      durationInFrames={STORY_DURATION * STORY_PRESETS.standard.fps}
      defaultProps={{...initial, layer:'background' as StoryLayer}}/>
    <Composition id="BeMyParolStoryLayerHigh" component={HighLayer} width={STORY_PRESETS.high.width}
      height={STORY_PRESETS.high.height} fps={STORY_PRESETS.high.fps}
      durationInFrames={STORY_DURATION * STORY_PRESETS.high.fps}
      defaultProps={{...initial, layer:'background' as StoryLayer}}/>
    <Composition id="BeMyParolSnapshot" component={ParolSnapshot} width={1200}
      height={1280} fps={30} durationInFrames={1} defaultProps={snapshotInitial}/>
  </>
)
registerRoot(Root)
