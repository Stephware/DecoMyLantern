export function selectRenderer(format, mode, backgroundAvailable) {
  return format === 'mp4' && mode === 'ffmpeg' && backgroundAvailable
    ? 'ffmpeg' : 'remotion'
}
