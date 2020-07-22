
import * as React from 'react'
import { useObserver } from 'mobx-react'
import { RouteComponentProps } from '@reach/router'
import { useStores } from '../../state/useStores'

import { Panel } from '../../components/Panel'
import { PanelButton } from '../../components/PanelButton'

import { patternSelector } from './patternSelector.pcss'
import { PatternName } from '../../state/patternsStore'
import { togglePattern } from '../../state/renderStateStore'

export interface PatternSelectorProps extends RouteComponentProps {
}

export const PatternSelector: React.FunctionComponent<PatternSelectorProps> = function PatternSelector (_props) {
  const { patterns, routing, renderState } = useStores()
  const setPattern = (name: PatternName) => React.useCallback(() => {
    patterns.currentPattern = name
    if (!renderState.showColors) {
      togglePattern(patterns, renderState)
    }
  }, [patterns, name])

  const setCustomPattern = React.useCallback(() => {
    patterns.currentPattern = 'custom'
  }, [patterns, routing])

  return useObserver(() => (
    <Panel title='Color Patterns' data-testid='pattern-selector'>
      <PanelButton
        toRoute='favoriteCusom'
        endIcon='play'
        suffix={Object.keys(patterns.favorites).length}
      >
        Saved
      </PanelButton>
      {
        patterns.patternNames.map(name => {
          if (name === 'custom') {
            const data = patterns.patternData.custom
            return (
              <PanelButton
                key={name}
                onClick={setCustomPattern}
                toRoute='customPalette'
                active={patterns.currentPattern === name}
                hoverColor={data.defaultColors[data.buttonNoteColor].toString()}
                endIcon='play'
              >
                {data.label}
              </PanelButton>
            )
          }

          const data = patterns.patternData[name]
          return (
            <PanelButton
              key={name}
              onClick={setPattern(name)}
              active={patterns.currentPattern === name}
              hoverColor={data.colors[data.buttonNoteColor].toString()}
              data-testid={`pattern-button-${name}`}
            >
              {data.label}
            </PanelButton>
          )
        })
      }
    </Panel>
  ))
}
