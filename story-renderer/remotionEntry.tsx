import {registerRoot, Composition, useCurrentFrame} from 'remotion'
import {StoryFrame, type StoryData} from '../src/frontend/src/features/story/StoryFrame'
import {ParolSnapshot, type ParolSnapshotData} from '../src/frontend/src/features/lantern/renderer/ParolSnapshot'

const initial: StoryData = {
  kind:'owner', designKey:'classic', patternKey:'default',
  friendCount:0, slots:[], highlightSlot:null,
}
const StoryVideo = (data: StoryData) => <StoryFrame data={data} frame={useCurrentFrame()}/>
const snapshotInitial: ParolSnapshotData = {
  designKey: 'classic', patternKey: 'default', friendCount: 0, slots: [],
}
const Root = () => (
  <>
    <Composition id="BeMyParolStory" component={StoryVideo} width={1080}
      height={1920} fps={30} durationInFrames={240} defaultProps={initial}/>
    <Composition id="BeMyParolSnapshot" component={ParolSnapshot} width={1200}
      height={1280} fps={30} durationInFrames={1} defaultProps={snapshotInitial}/>
  </>
)
registerRoot(Root)
