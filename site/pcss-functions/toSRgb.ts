
import { printDigits } from '../helpers/numbers'

import { colorConversion } from './constants'
import { parseColor } from './parseColor'
import { HSLa } from './toHsl'
import { HSVa } from './toHsv'
import { RGBa, toRgb } from './toRgb'
import { Color } from './types'

export function toSRgb (color: Color): SRGBa {
  if (typeof color === 'string') {
    color = parseColor(color)
  }

  if (color.type === 'SRGBa') {
    return color
  }

  if (color.type === 'HSLa') {
    return SRGBa.fromHSL(color)
  }

  if (color.type === 'HSVa') {
    return SRGBa.fromHSV(color)
  }

  return SRGBa.fromRgb(toRgb(color))
}

function toHex (num: number) {
  num = Math.round(num)
  let str = Math.max(0, Math.min(num, 255)).toString(16)
  if (str.length === 1) {
    return `0${str}`
  } else {
    return str
  }
}

export class SRGBa {
  readonly type = 'SRGBa'

  constructor (
    public r: number,
    public g: number,
    public b: number,
    public a = 1,
  ) {}

  map (mapper: (n: number) => number) {
    return [this.r, this.g, this.b].map(mapper).concat(this.a) as [number, number, number, number]
  }

  toString () {
    if (this.a !== 1) {
      const R = printDigits(this.r * 255, 2)
      const G = printDigits(this.g * 255, 2)
      const B = printDigits(this.b * 255, 2)
      const a = printDigits(this.a, 4)
      return `rgba(${R}, ${G}, ${B}, ${a})`
    } else {
      const R = toHex(this.r * 255)
      const G = toHex(this.g * 255)
      const B = toHex(this.b * 255)
      return `#${R}${G}${B}`
    }
  }

  toArray (): [number, number, number, number] {
    return [this.r, this.g, this.b, this.a]
  }

  valueOf () {
    return this.toArray()
  }

  clone () {
    return new SRGBa(this.r, this.g, this.b, this.a)
  }

  fixSRgb () {
    return toSRgb(new RGBa(...this.toArray()))
  }


  // RGBa => SRGBa
  static fromRgb (orig: RGBa) {
    if (orig.type !== 'RGBa') {
      throw new Error('input to fromRgb must be of type Rgba')
    }

    return new SRGBa(...orig.map(c => {
      if (c <= colorConversion.sRgbCutoff / colorConversion.lowRatio) {
        return c * colorConversion.lowRatio
      }

      return Math.pow(c * (1 + colorConversion.fix), 1 / colorConversion.power) - colorConversion.fix
    }))
  }

  static fromHSL (orig: HSLa) {
    if (orig.type !== 'HSLa') {
      throw new Error('input to fromHSL must be of type HSLa')
    }

    const H = orig.h
    const S = orig.s
    const L = orig.l

    if (S === 0) {
      return new SRGBa(L, L, L, orig.a)
    }

    const q = L < 0.5 ? L * (1 + S) : L + S - L * S
    const p = 2 * L - q

    const ts = [
      (H / 360 + 1 / 3) % 1,
      (H / 360),
      (H / 360 + 2 / 3) % 1,
    ]
    const [r, g, b] = ts.map(t => {
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    })

    return new SRGBa(r, g, b, orig.a)
  }

  static fromHSV (orig: HSVa) {
    const H = orig.h
    const S = orig.s
    const V = orig.v

    const min = V - (V * S)
    const max = V * S + min
    const mid = V * S * (1 - Math.abs(((H / 60) % 2) - 1)) + min

    let R
    let G
    let B
    if (H < 60) {
      R = max
      G = mid
      B = min
    } else if (H < 120) {
      R = mid
      G = max
      B = min
    } else if (H < 180) {
      R = min
      G = max
      B = mid
    } else if (H < 240) {
      R = min
      G = mid
      B = max
    } else if (H < 300) {
      R = mid
      G = min
      B = max
    } else {
      R = max
      G = min
      B = mid
    }

    return new SRGBa(R, G, B, orig.a)
  }
}
