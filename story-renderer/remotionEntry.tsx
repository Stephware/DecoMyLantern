import {registerRoot, Composition, useCurrentFrame} from 'remotion'
import {StoryFrame, type StoryData, type StoryLayer} from '../src/frontend/src/features/story/StoryFrame'
import {ParolSnapshot, type ParolSnapshotData} from '../src/frontend/src/features/lantern/renderer/ParolSnapshot'

const initial: StoryData = {
  kind:'owner', designKey:'classic', patternKey:'default',
  friendCount:0, slots:[], highlightSlot:null,
}
const StoryVideo = (data: StoryData) => <StoryFrame data={data} frame={useCurrentFrame()}/>
const Layer = (data: StoryData & {layer: StoryLayer; sourceFrame?: number}) =>
  <StoryFrame data={data} frame={data.sourceFrame ?? useCurrentFrame()} layer={data.layer}/>
const snapshotInitial: ParolSnapshotData = {
  designKey: 'classic', patternKey: 'default', friendCount: 0, slots: [],
}
const Root = () => (
  <>
    <Composition id="BeMyParolStory" component={StoryVideo} width={1080}
      height={1920} fps={30} durationInFrames={240} defaultProps={initial}/>
    <Composition id="BeMyParolStoryLayer" component={Layer} width={1080}
      height={1920} fps={30} durationInFrames={240}
      defaultProps={{...initial, layer:'background' as StoryLayer}}/>
    <Composition id="BeMyParolSnapshot" component={ParolSnapshot} width={1200}
      height={1280} fps={30} durationInFrames={1} defaultProps={snapshotInitial}/>
  </>
)
registerRoot(Root)
