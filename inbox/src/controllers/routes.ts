import { Router } from '@well-known-components/http-server'
import { statusHandler } from './handlers/status-handler'
import { eventsHandler } from './handlers/events-handler'
import { notificationsHandler, readNotificationsHandler } from './handlers/notifications-handler'
import { errorHandler } from './handlers/error-handler'
import * as authorizationMiddleware from 'decentraland-crypto-middleware'
import { GlobalContext } from '../types'

const FIVE_MINUTES = 5 * 60 * 1000

// We return the entire router because it will be easier to test than a whole server
export async function setupRouter(_: GlobalContext): Promise<Router<GlobalContext>> {
  const router = new Router<GlobalContext>()

  router.use(errorHandler)

  router.get('/status', statusHandler)

  router.get(
    '/notifications/events',
    authorizationMiddleware.wellKnownComponents({
      optional: false,
      expiration: FIVE_MINUTES
    }),
    eventsHandler
  )
  router.get(
    '/notifications',
    authorizationMiddleware.wellKnownComponents({
      optional: false,
      expiration: FIVE_MINUTES
    }),
    notificationsHandler
  )
  router.put(
    '/notifications/read',
    authorizationMiddleware.wellKnownComponents({
      optional: false,
      expiration: FIVE_MINUTES
    }),
    readNotificationsHandler
  )

  return router
}
