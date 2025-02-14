
import { useMemo } from 'react'

import { AnalysisProp, analysisStore } from './analysisStore'
import { ApiStatusProp, apiStatusStore } from './apiStatusStore'
import { introStore, IntroStoreProp } from './introStore'
import { MediaProp, mediaStore } from './mediaStore'
import { PatternsProp, patternsStore } from './patternsStore'
import { RenderStateProp, renderStateStore } from './renderStateStore'
import { RoutingProp, routingStore } from './routingStore'

export type MobxStoresProps =
  & AnalysisProp
  & ApiStatusProp
  & IntroStoreProp
  & MediaProp
  & PatternsProp
  & RenderStateProp
  & RoutingProp

const stores: MobxStoresProps = Object.freeze({
  // 关联analysisStore， 数据修改的时候自己会有通知
  analysis: analysisStore,
  apiStatus: apiStatusStore,
  intro: introStore,
  media: mediaStore,
  patterns: patternsStore,
  renderState: renderStateStore,
  routing: routingStore,
})

export function useStores () {
  return useMemo<MobxStoresProps>(() => stores, [])
}

const win = window as any
if (__DEV__ || win.Cypress) {
  win.stores = stores
}
