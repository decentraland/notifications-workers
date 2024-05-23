import { Router } from '@well-known-components/http-server'
import { publishNotificationHandler } from './handlers/publish-notification-handler'
import { GlobalContext } from '../types'
import { bearerTokenMiddleware, errorHandler } from '@dcl/platform-server-commons'
import { statusHandler } from './handlers/status-handler'
import { setCursorHandler } from './handlers/set-cursor-handler'
import { testNotificationPreviewHandler, testRandomNotificationsHandler } from './handlers/test-notifications-handler'

// We return the entire router because it will be easier to test than a whole server
export async function setupRouter(globalContext: GlobalContext): Promise<Router<GlobalContext>> {
  const router = new Router<GlobalContext>()
  router.use(errorHandler)

  router.get('/status', statusHandler)

  const secret = await globalContext.components.config.getString('INTERNAL_API_KEY')
  if (secret) {
    router.post('/notifications', bearerTokenMiddleware(secret), publishNotificationHandler)
    router.post('/producers/:producer/set-since', bearerTokenMiddleware(secret), setCursorHandler)

    router.get('/test-notifications', testRandomNotificationsHandler)
    router.get('/test-notifications/:notificationId', testNotificationPreviewHandler)
  }
  // http://0.0.0.0:5002/test-notifications/8d2f7f24-f76f-4be7-a0ad-bf3b178c728a
  return router
}
