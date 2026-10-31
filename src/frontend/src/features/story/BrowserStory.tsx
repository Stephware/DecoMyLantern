import {useCurrentFrame} from 'remotion'
import {StoryFrame, type StoryData} from './StoryFrame'

export default function BrowserStory(data:StoryData) {
  return <StoryFrame data={data} frame={useCurrentFrame()}
    backgroundAssetUrl="/story-assets/story-night-v2.svg"/>
}
