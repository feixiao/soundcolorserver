
import { Router, Request } from 'express'
import * as asyncHandler from 'express-async-handler'
import { config } from '../../config'
import { createApiFromAccessCode, getLocalApi, getApi } from '../../hue-helpers/getApi'
import { logger } from '../../../shared/logger'
import { OAuthProvider, verifyOauthState } from '../../db/oauthState'
import { NoHeaderError } from '../../errors/NoHeaderError'
import { InvalidOauthCallbackError } from '../../errors/InvalidOauthCallbackError'

export const authRouter = Router()

authRouter.get('/status', asyncHandler(async (req, res) => {
  let authenticated: boolean
  try {
    await getApi(req.getSessionId())
    authenticated = true
  } catch (e) {
    authenticated = false
  }

  res.send({
    authenticated,
  })
}))

const HUE_REFERER = /^https:\/\/\w+\.meethue\.com/
function getOauthProvider (req: Request): OAuthProvider {
  if (!req.headers) {
    throw new NoHeaderError('referer')
  }
  const referer = req.headers.referer
  if (!referer) {
    throw new NoHeaderError('referer')
  }

  if (HUE_REFERER.test(referer)) {
    return 'hue'
  }

  throw new InvalidOauthCallbackError()
}

if (config.remoteApi) {
  authRouter.get('/callback', asyncHandler(async (req, res) => {
    const session = req.getSessionId()
    const state: string = req.query.state
    const provider = getOauthProvider(req)
    const code: string = req.query.code

    logger.debug(`OAuth session: ${session}`)
    logger.debug(`OAuth state: ${state}`)
    logger.debug(`OAuth provider: ${provider}`)
    logger.debug(`OAuth code: ${code}`)

    const valid = await verifyOauthState(session, state, provider)
    if (!valid) {
      throw new InvalidOauthCallbackError()
    }

    const api = await createApiFromAccessCode(session, code)
    if (api) {
      return res.redirect('/')
    }

    res.status(400).send('Something went wrong, please try again.')
  }))
} else {
  authRouter.get('/connect', asyncHandler(async (req, res) => {
    await getLocalApi()
    res.send({
      status: 'connected',
    })
  }))
}
