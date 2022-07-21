
import { logger } from '../../shared/logger'
import { renderStateStore } from '../state/renderStateStore'

let context: AudioContext | null = null

export function getContext () {
  if (!context) {
    // balanced 平衡音频输出延迟和资源消耗
    // inteactive 默认值 提供最小的音频输出延迟最好没有干扰
    // playback 对比音频输出延迟，优先重放不被中断
    context = new AudioContext({
      latencyHint: 'playback',
    })
  }

  return context
}

let onResume: () => void
export const resumePromise = new Promise(resolve => {
  onResume = resolve
})

let internalResumePromise: Promise<void>
export function resume () {
  logger.info('resume called')
  if (!internalResumePromise) {
    renderStateStore.showColors = true
    internalResumePromise = getContext().resume().then(onResume)
  }

  return internalResumePromise
}
