import {registerRoot, Composition, useCurrentFrame} from 'remotion'
import {StoryFrame, type StoryData} from './StoryFrame'

const initial: StoryData = {
  kind:'owner', designKey:'classic', patternKey:'default',
  friendCount:0, slots:[], highlightSlot:null,
}
const StoryVideo = (data: StoryData) => <StoryFrame data={data} frame={useCurrentFrame()}/>
const Root = () => (
  <Composition id="BeMyParolStory" component={StoryVideo} width={1080}
    height={1920} fps={30} durationInFrames={240} defaultProps={initial}/>
)
registerRoot(Root)
