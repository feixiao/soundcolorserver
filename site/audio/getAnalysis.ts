
import { info } from 'console'
import { logger } from '../../shared/logger'
import { patternsStore } from '../state/patternsStore'

import { fftSize, getFft } from './analyzer'
import { getContext } from './context'
import { getNoteInformation, NoteInfo } from './getNoteInformation'

export const MIN_FOR_STATS = -100
export const MAX_TONES = 5
const MAX_STRENGTHS = MAX_TONES * 10
const DEFAULT_STATS = {
  dB: {
    mean: -1000,
    deviation: 0,
  },
  volume: {
    mean: 1 / (2 ** 100),
    deviation: 0,
  },
  counted: 0,
}

function getStats (fft: Float32Array) {
  // reduce() 方法接受一个函数作为参数，这个函数作为一个累加器，从左到右遍历整个类型数组，最后返回一个单一的值
  // curr为数组当前的值
  // val必需。初始值({ total: 0, count: 0 }), 或者计算结束后的返回值。
  const meanStats = fft.reduce((val, curr) => {
    // 逻辑理解为去掉小于MIN_FOR_STATS(-100的数据)
    if (curr > MIN_FOR_STATS) {
      val.total += curr
      val.count++
    }
    return val
  }, { total: 0, count: 0 })

  if (meanStats.count === 0) {
    return DEFAULT_STATS
  }
  
  const meandB = meanStats.total / meanStats.count

  const varianceStats = fft.reduce((val, curr) => {
    if (curr > MIN_FOR_STATS) {
      val.total += (curr - meandB) ** 2
      val.count++
    }
    return val
  }, { total: 0, count: 0 })
  const deviationdB = Math.sqrt(varianceStats.total / varianceStats.count)

  const mean = dBtoVolume(meandB)
  const deviation = dBtoVolume(deviationdB)

  return {
    dB: {
      mean: meandB,
      deviation: deviationdB,
    },
    volume: {
      mean: mean,
      deviation: deviation,
    },
    counted: meanStats.count,
  }
}

interface ToneStrength {
  value: number
  idx: number
}

export interface ToneInfo {
  dB: number
  frequency: number
  harmonics: number
  note: NoteInfo
}

function getStrongestValues (fft: Float32Array, minToCount: number) {
  const strongest: ToneStrength[] = []

  // value和idx 参数哪里来 ？
  // value为当前的值，idex是索引
  // https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/forEach
  function addIfHigher (value: number, idx: number) {
    const previous = fft[idx - 1] || -Infinity
    const next = fft[idx + 1] || -Infinity
    const isLocalMaximum = previous < value && next < value
    if (!isLocalMaximum || value < minToCount || idx === 0) {
      return
    }

    const obj = {
      value: value,
      idx: idx,
    }
    if (strongest.length === 0) {
      strongest.push(obj)
      return
    } else {
      let insertionIndex = -1
      for (let i = 0; i < strongest.length; i++) {
        if (value > strongest[i].value) {
          insertionIndex = i
          break
        }
      }
      if (insertionIndex === -1 && strongest.length < MAX_STRENGTHS) {
        strongest.push(obj)
      } else if (insertionIndex >= 0) {
        // 在insertionIndex的位置插入obj，其他的往后移
        strongest.splice(insertionIndex, 0, obj)
        if (strongest.length > MAX_STRENGTHS) {
          // 删除最后一个
          strongest.splice(MAX_STRENGTHS, 1)
        }
      }
    }
  }

  fft.forEach(addIfHigher)

  logger.info(getContext().sampleRate)
  logger.info('getStrongestValues output', strongest.map(({ idx, value }) => {
    const frequency = idx * (getContext().sampleRate) / fftSize
    return {
      frequency,
      dB: value,
    }
  }))

  return strongest
}

function getTones (strengths: ToneStrength[]): ToneInfo[] {
  let tones = strengths.map(({ value, idx }) => {
    const frequency = idx * (getContext().sampleRate) / fftSize

    // logger.info(idx, frequency,fftSize, getContext().sampleRate)
    return {
      dB: value,
      frequency: frequency,
      harmonics: 1,
      note: getNoteInformation(frequency),
    }
  }) // end of map opt


  logger.info('frank tones internal start')
  logger.info(JSON.stringify(tones));
  logger.info('frank tones internal stop')

  // 过滤数据
  // slice() 方法會回傳一個新陣列物件，為原陣列選擇之 begin 至 end（不含 end）部分的淺拷貝（shallow copy）。
  // some() 方法會透過給定函式、測試陣列中是否至少有一個元素，通過該函式所實作的測試。
  tones = tones.filter(({ dB, note: { note } }, ownIdx) => (
    // [0,ownIdx) 找是否有跟ownIdx相同的note
    // ! ?作用？ 

    // dB和 note 需要第一个for循环


    // 待分析[0，ownIdx)是否有符合规则的
    // tones.slice返回null的时候，这个owdIdx才是符合要求的
    !tones.slice(0, ownIdx).some((data) => {
      // data 属于第二个循环
      if (data.note.note === note) {
        data.harmonics++
        const volume = dBtoVolume(data.dB) + dBtoVolume(dB)
        data.dB = Math.log2(volume) * 10 // 修改了dB数据， 所以上面和下面的不一样了
        return true
      } else {
        return false
      }
    }) // end of some
  )    // end of

  ) // end of filter
  
  logger.info('frank tones slice start')
  logger.info(JSON.stringify(tones));

  logger.info('frank tones slice *****************************')
  // 截取[0, MAX_TONES)
  tones = tones.slice(0, MAX_TONES)

  logger.info(JSON.stringify(tones));
  logger.info('frank tones slice stop')

  return tones
}

const dBBase = 2
const dBLogFactor = Math.log2(dBBase) / 10
export function dBtoVolume (dB: number) {
  return dBBase ** (dB / 10)
}

export function volumeTodB (volume: number) {
  if (volume <= 0) {
    return -Infinity
  }
  return Math.log2(volume) / dBLogFactor
}

export interface Analysis {
  noise: number
  tones: ToneInfo[]
  fft: Float32Array
}

// 获取分析需要的音频数据
export function getAnalysis (): Analysis {

  // analyser.getFloatFrequencyData
  const fft = getFft()

  logger.info("[frank]  fft start")
  logger.info(fft.toString());
  logger.info("[frank]  fft stop")

  // stats计算原理待分析
  const stats = getStats(fft)

  logger.info("[frank] stats start")
  logger.info(JSON.stringify(stats));
  logger.info("[frank] stats stop")

  const mindB = stats.dB.mean + stats.dB.deviation * patternsStore.toneSigma

  logger.info("[frank] strongest start")
  logger.info(JSON.stringify(patternsStore));
  const strongest = getStrongestValues(fft, mindB)
  logger.info(JSON.stringify(strongest))
  logger.info("[frank] strongest stop")

  logger.info("[frank] tones start")
  const tones = getTones(strongest)
  logger.info(JSON.stringify(tones))
  logger.info("[frank] tones stop")

  // 用reduce做了db累加
  const tonalVolume = tones.reduce((total, { dB }) => total + dBtoVolume(dB), 0)
  const noiseVolume = stats.volume.mean - (tonalVolume / stats.counted)
  const noise = volumeTodB(noiseVolume)

  logger.info(tonalVolume, noiseVolume, noise)
  

  return {
    noise,
    tones,
    fft,
  }
}
