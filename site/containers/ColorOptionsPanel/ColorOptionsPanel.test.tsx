
import * as React from 'react'
import { render } from '@testing-library/react'
import { mockUseStores } from '../../state/mockUseStores'

import { ColorOptionsPanel } from './ColorOptionsPanel'
import { PatternsStore } from '../../state/patternsStore'

describe(ColorOptionsPanel.name, () => {
  const useStoresSpy = mockUseStores()

  beforeEach(() => {
    useStoresSpy.mockReset()
  })

  it('should render', () => {
    const expected = 'Vibrance0.2'

    const patterns: DeepPartial<PatternsStore> = {
      vibranceMultiplier: 1,
      noiseMultiplier: 1,
      minimumBrightness: 0.5,
      monochrome: false,
    }
    useStoresSpy.mockReturnValue({ patterns })

    const mounted = render(<ColorOptionsPanel />)
    const el = mounted.getByTestId('color-options-panel-slider-vibranceMultiplier')

    expect(el).toHaveTextContent(expected)
  })
})
