
import * as React from 'react'
import { select } from '@storybook/addon-knobs'

import { Icon } from './Icon'
import { iconNames } from './iconOptions'

export default {
  title: 'Icon',
}

export const specificIcon = () => (
  <Icon color='var(--black)' name={select('icon', iconNames, 'favorite_border')} />
)
