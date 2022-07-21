
import { action, observable } from 'mobx'

import { Analysis, getAnalysis, ToneInfo } from '../../audio/getAnalysis'
import { getMiniFft } from '../../audio/miniAnalyser'

export interface AnalysisProp {
  analysis: AnalysisStore
}

export class AnalysisStore implements Analysis {
  private _animationFrame = 0

  @observable noise = 0
  @observable tones: ToneInfo[] = []
  @observable miniFft = new Float32Array(0)
  @observable fft = new Float32Array(0)
  @observable paused = false

  @action
  setAnalysis ({ noise, tones, fft }: Analysis, miniFft: Float32Array) {
    this.noise = noise    // 噪声
    this.tones = tones    // 音调
    this.fft = fft
    this.miniFft = miniFft
  }

  @action
  startAnalysis () {
    this.paused = false
    this._requestAnalysis()
  }

  @action
  pauseAnalysis () {
    this.paused = true
    cancelAnimationFrame(this._animationFrame)
  }

  private _requestAnalysis = () => {
    if (this.paused) {
      return
    }
    this.setAnalysis(getAnalysis(), getMiniFft())
    // window.requestAnimationFrame() 告诉浏览器——你希望执行一个动画，并且要求浏览器在下次重绘之前调用指定的回调函数更新动画
    // requestAnimationFrame 每16.7m调用一次
    this._animationFrame = requestAnimationFrame(this._requestAnalysis)
  }
}

export const analysisStore = new AnalysisStore()
