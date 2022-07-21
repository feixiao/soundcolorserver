
import { patternsStore } from '../state/patternsStore'

import { getAnalyser } from './analyzer'
import { getContext } from './context'

export const fftSize = 1024
let analyser: AnalyserNode
let fftArray: Float32Array
let analyserPromise: Promise<AnalyserNode>
let prevSource: AudioNode

export async function getMiniAnalyser () {
  if (!analyserPromise) {
    analyserPromise = (async () => {
      const source = prevSource || await getAnalyser()
      prevSource = source

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

const emptyArray = new Float32Array(0)
export function getMiniFft () {
  if (!analyser) {
    return emptyArray
  }

  // getFloatFrequencyData() 作为AnalyserNode 接口的方法能将当前分析节点（AnalyserNode）的频率数据拷贝进一个 Float32Array (en-US) 数组对象。
  // 此数组表示的频率范围为 0 ~ 22050 Hz，每个元素表示对应频率上的信号分量强度，单位为分贝。
  analyser.getFloatFrequencyData(fftArray)
  return fftArray
}
