
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

      // fftSize： fft是快速傅里叶变换，fftSize就是样本的窗口大小。 fftSize的值必须是32-32768范围内的2的非零幂
      analyser = getContext().createAnalyser()
      analyser.fftSize = fftSize

      // smoothingTimeConstant 属性的默认值为 0.8; 值的范围必须在 0 ~ 1 之间。
      // 如果设置为 0，则不进行平均，而值为 1 意味着 "在计算值时重叠上一个缓冲区和当前缓冲区相当多", 它基本上平滑了 AnalyserNode.getFloatFrequencyData/AnalyserNode.getByteFrequencyData 调用的变化
      analyser.smoothingTimeConstant = patternsStore.timeSmoothing

      // frequencyBinCount 的值固定为 AnalyserNode 接口中 fftSize 值的一半。该属性通常用于可视化的数据值的数量。
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

  // 此数组表示的频率范围为 0 ~ 22050 Hz，每个元素表示对应频率上的信号分量强度，单位为分贝。
  analyser.getFloatFrequencyData(fftArray)
  logger.info('fft', analyser.frequencyBinCount, fftSize)
  return fftArray
}
