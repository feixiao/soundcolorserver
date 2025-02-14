
import { dBtoVolume, MAX_TONES, ToneInfo } from '../audio/getAnalysis'
import ConnectionsPanelStories from '../containers/ConnectionsPanel/ConnectionsPanel.stories'
import { greyScale } from '../pcss-functions/getLuminance'
import { HSVa, toHsv } from '../pcss-functions/toHsv'
import { RGBa, toRgb } from '../pcss-functions/toRgb'
import { analysisStore } from '../state/analysisStore'
import { patternsStore } from '../state/patternsStore'

interface SmoothValues {
  s: number
  v: number
  r: number
  g: number
  b: number
}

// Smoother 类似函数指针
interface Smoother {
  (color: RGBa | HSVa, key: keyof SmoothValues, delta: number, speed: number): number
}

function makeSmoother (): Smoother {
  const values: SmoothValues = {
    s: 0,
    v: 0,
    r: 0,
    g: 0,
    b: 0,
  }
  return function smooth (color, key, delta, speed) {
    const smoothingVal = (1 - speed) ** (delta)
    let tmp =  values[key] * smoothingVal + (color as any)[key] * (1 - smoothingVal);
    values[key] = tmp
    console.log(" soomther values ", values)
    console.log(" soomther ", color, key, delta, speed)
    return tmp
  }
}

let smoothers: Smoother[]
function getSmoothers () {
  if (!smoothers) {
    smoothers = Array.from(Array(MAX_TONES)).map(makeSmoother)
  }

  return smoothers
}

function fillTones (tones: ToneInfo[]): ToneInfo[] {
  if (tones.length === 0) {
    return []
  }

  let output = [...tones]
  while (output.length < MAX_TONES) {
    output = [...output, ...tones]
  }

  return output.slice(0, MAX_TONES)
}

let lastTime = Date.now()

// 声音转换为颜色
export function getColorsFromAnalysis (
  // 关联analysisStore， 数据修改的时候自己会有通知
  analysis = analysisStore,
  patterns = patternsStore,
): HSVa[] {
  const { noise, tones } = analysis
  let {
    transitionSpeed,
    noiseMultiplier,
    vibranceMultiplier,
    monochrome,
    currentPattern,
    patternData,
    minimumBrightness,
  } = patterns


  console.log("getColorsFromAnalysis start ...")
  // 模式对应的颜色表
  const colorMap = patternData[currentPattern].colors

  noiseMultiplier = noiseMultiplier > 0 ? 2 ** noiseMultiplier : 0
  vibranceMultiplier = 2 ** vibranceMultiplier
  const saturationMult = Math.max(0, Math.min(1 - (dBtoVolume(noise) * noiseMultiplier), 1))
  const newTime = Date.now()
  const delta = (newTime - lastTime) / 1000
  lastTime = newTime
  console.log(noiseMultiplier, vibranceMultiplier, noise)
  console.log("getColorsFromAnalysis stop ...")

  // ??? note ???
  return fillTones(tones).map(({ dB, note: { note } }, idx) => {

    console.log("fillTones start ......");
    const smooth = getSmoothers()[idx]
    const valueMult = Math.max(0, Math.min(dBtoVolume(dB) * vibranceMultiplier, 1))
    console.log(idx, valueMult, dB, delta, transitionSpeed);
    console.log("fillTones stop  ......");

    const hsv = colorMap[note].clone()

    console.log("frank hsv old ......");
    console.log(JSON.stringify(hsv)) 
    hsv.s *= saturationMult
    hsv.v *= valueMult

    hsv.s = (1 - minimumBrightness) * hsv.s
    hsv.v = 1 - ((1 - minimumBrightness) * (1 - hsv.v))

    console.log(JSON.stringify(hsv)) 
    console.log("frank hsv new ......");

    // RGBA和HSVA互转
    // RGBa
    const rgb = toRgb(hsv)

    console.log("[frank] toRgb")
    console.log(JSON.stringify(rgb)) 
    console.log("[frank] toRgb")


    let rgba = new RGBa(
      smooth(rgb, 'r', delta, transitionSpeed),
      smooth(rgb, 'g', delta, transitionSpeed),
      smooth(rgb, 'b', delta, transitionSpeed),
    )

    console.log("[frank] smooth rgba")
    console.log(JSON.stringify(rgba)) 
    console.log("[frank] smooth rgba")

    const { h } = toHsv(rgba)
    console.log(JSON.stringify(hsv)) 
    console.log("[frank] toHsv")

    const hsva = new HSVa(
      h,
      smooth(hsv, 's', delta, transitionSpeed),
      smooth(hsv, 'v', delta, transitionSpeed),
    )

    console.log("[frank] hsva ......")
    console.log(JSON.stringify(hsva)) 
    console.log("[frank] hsva ......")

    if (monochrome) {
      // const luminance = getLuminance(hsva)
      return toHsv(greyScale(hsva))
    }

    return hsva
  })
}
