
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
    return values[key] = values[key] * smoothingVal + (color as any)[key] * (1 - smoothingVal)
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

  // 模式对应的颜色表
  const colorMap = patternData[currentPattern].colors

  noiseMultiplier = noiseMultiplier > 0 ? 2 ** noiseMultiplier : 0
  vibranceMultiplier = 2 ** vibranceMultiplier
  const saturationMult = Math.max(0, Math.min(1 - (dBtoVolume(noise) * noiseMultiplier), 1))
  const newTime = Date.now()
  const delta = (newTime - lastTime) / 1000
  lastTime = newTime

  // ??? note ???
  return fillTones(tones).map(({ dB, note: { note } }, idx) => {
    const smooth = getSmoothers()[idx]
    const valueMult = Math.max(0, Math.min(dBtoVolume(dB) * vibranceMultiplier, 1))
    const hsv = colorMap[note].clone()

    hsv.s *= saturationMult
    hsv.v *= valueMult

    hsv.s = (1 - minimumBrightness) * hsv.s
    hsv.v = 1 - ((1 - minimumBrightness) * (1 - hsv.v))

    // RGBA和HSVA互转
    const rgb = toRgb(hsv)
    const { h } = toHsv(new RGBa(
      smooth(rgb, 'r', delta, transitionSpeed),
      smooth(rgb, 'g', delta, transitionSpeed),
      smooth(rgb, 'b', delta, transitionSpeed),
    ))

    console.log("[frank] hsv start")
    console.log(hsv.toString()) 
    console.log("[frank] rgb start")
    console.log(rgb.toString()) 
    console.log("[frank] color stop");
    const hsva = new HSVa(
      h,
      smooth(hsv, 's', delta, transitionSpeed),
      smooth(hsv, 'v', delta, transitionSpeed),
    )

    if (monochrome) {
      // const luminance = getLuminance(hsva)
      return toHsv(greyScale(hsva))
    }

    return hsva
  })
}
