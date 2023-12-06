import { Router } from '@well-known-components/http-server'
import { statusHandler } from './handlers/status-handler'
import { eventsHandler } from './handlers/events-handler'
import { notificationsHandler } from './handlers/notifications-handler'
import { errorHandler } from '@dcl/platform-server-commons'
import { wellKnownComponents as authorizationMiddleware } from '@dcl/platform-crypto-middleware'
import { GlobalContext } from '../types'
import { readNotificationsHandler } from './handlers/read-notifications-handler'

const FIVE_MINUTES = 5 * 60 * 1000

// We return the entire router because it will be easier to test than a whole server
export async function setupRouter({ components }: GlobalContext): Promise<Router<GlobalContext>> {
  const router = new Router<GlobalContext>()

  const { fetcher } = components

  router.use(errorHandler)

  router.get('/status', statusHandler)

  router.get(
    '/notifications/events',
    authorizationMiddleware({
      optional: false,
      expiration: FIVE_MINUTES,
      fetcher
    }),
    eventsHandler
  )
  router.get(
    '/notifications',
    authorizationMiddleware({
      optional: false,
      expiration: FIVE_MINUTES,
      fetcher
    }),
    notificationsHandler
  )
  router.put(
    '/notifications/read',
    authorizationMiddleware({
      optional: false,
      expiration: FIVE_MINUTES,
      fetcher
    }),
    readNotificationsHandler
  )

  return router
}
