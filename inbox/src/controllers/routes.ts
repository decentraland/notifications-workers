import { Router } from '@well-known-components/http-server'
import { statusHandler } from './handlers/status-handler'
import { notificationsHandler } from './handlers/notifications-handler'
import { errorHandler } from '@dcl/platform-server-commons'
import { wellKnownComponents as authorizationMiddleware } from '@dcl/platform-crypto-middleware'
import { GlobalContext } from '../types'
import { readNotificationsHandler } from './handlers/read-notifications-handler'
import { getSubscriptionHandler } from './handlers/get-subscription-handler'
import { putSubscriptionHandler } from './handlers/put-subscription-handler'
import {
  confirmEmailHandler,
  getUnconfirmedEmailHandler,
  storeUnconfirmedEmailHandler
} from './handlers/unconfirmed-email-handlers'

const FIVE_MINUTES = 5 * 60 * 1000

// We return the entire router because it will be easier to test than a whole server
export async function setupRouter({ components }: GlobalContext): Promise<Router<GlobalContext>> {
  const router = new Router<GlobalContext>()

  const { fetcher } = components

  const signedFetchMiddleware = authorizationMiddleware({
    fetcher,
    optional: false,
    expiration: FIVE_MINUTES,
    onError: (err) => ({ error: err.message, message: 'This endpoint requires a signed fetch request. See ADR-44.' })
  })

  router.use(errorHandler)

  router.get('/status', statusHandler)

  router.get('/notifications', signedFetchMiddleware, notificationsHandler)
  router.put('/notifications/read', signedFetchMiddleware, readNotificationsHandler)

  router.get('/subscription', signedFetchMiddleware, getSubscriptionHandler)
  router.put('/subscription', signedFetchMiddleware, putSubscriptionHandler)

  router.get('/unconfirmed-email', signedFetchMiddleware, getUnconfirmedEmailHandler)
  router.put('/set-email', signedFetchMiddleware, storeUnconfirmedEmailHandler)
  router.get('/confirm-email', confirmEmailHandler)

  return router
}
