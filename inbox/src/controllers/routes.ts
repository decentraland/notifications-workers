import { Router } from '@well-known-components/http-server'
import { GlobalContext } from '../types'
import { statusHandler } from './handlers/status-handler'
import { eventsHandler } from './handlers/events-handler'
import { notificationsHandler, readNotificationsHandler } from './handlers/notifications-handler'
import { errorHandler } from './handlers/error-handler'

// We return the entire router because it will be easier to test than a whole server
export async function setupRouter(_: GlobalContext): Promise<Router<GlobalContext>> {
  const router = new Router<GlobalContext>()

  router.use(errorHandler)

  router.get('/status', statusHandler)
  router.get('/notifications/events', eventsHandler)
  router.get('/notifications', notificationsHandler)
  router.put('/notifications/read', readNotificationsHandler)

  return router
}
