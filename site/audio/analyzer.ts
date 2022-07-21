
import { logger } from '../../shared/logger'
import { patternsStore } from '../state/patternsStore'

import { getContext } from './context'
import { getAudioSource } from './microphoneSource'

export const fftSize = 32768 // maximum size allowed
let analyser: AnalyserNode
let fftArray: Float32Array
let analyserPromise: Promise<AnalyserNode>
let prevSource: AudioNode | null = null

export async function getAnalyser () {
  if (!analyserPromise) {
    analyserPromise = (async () => {
      const source = prevSource || await getAudioSource()
      prevSource = source

      // https://developer.mozilla.org/zh-CN/docs/Web/API/BaseAudioContext/createAnalyser
      // 能创建一个AnalyserNode，可以用来获取音频时间和频率数据，以及实现数据可视化。
      // https://mdn.github.io/voice-change-o-matic/
      analyser = getContext().createAnalyser()
      analyser.fftSize = fftSize
      analyser.smoothingTimeConstant = patternsStore.timeSmoothing

      fftArray = new Float32Array(analyser.frequencyBinCount)

      source.connect(analyser)
      return analyser
    })()
  }
  return analyserPromise
}

export function setSource (newSource: AudioNode | null) {
  if (prevSource && analyser) {
    prevSource.disconnect(analyser)
    prevSource.disconnect()
  }
  if (newSource && analyser) {
    newSource.connect(analyser)
  }

  prevSource = newSource
}

const emptyArray = new Float32Array(0)
export function getFft () {
  if (!analyser) {
    return emptyArray
  }

  analyser.getFloatFrequencyData(fftArray)
  logger.info('fft', analyser.frequencyBinCount, fftSize)
  return fftArray
}
