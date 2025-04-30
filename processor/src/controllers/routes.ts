import { Router } from '@well-known-components/http-server'
import { publishNotificationHandler } from './handlers/publish-notification-handler'
import { GlobalContext } from '../types'
import { bearerTokenMiddleware, errorHandler } from '@dcl/platform-server-commons'
import { statusHandler } from './handlers/status-handler'
import { testNotificationPreviewHandler, testRandomNotificationsHandler } from './handlers/test-notifications-handler'
import { setupWebSocketEventsHandler } from './handlers/ws'

// We return the entire router because it will be easier to test than a whole server
export async function setupRouter(
  globalContext: GlobalContext
): Promise<{ router: Router<GlobalContext>; setupWebSocketHandler: () => void }> {
  const router = new Router<GlobalContext>()
  router.use(errorHandler)

  router.get('/status', statusHandler)

  const secret = await globalContext.components.config.getString('INTERNAL_API_KEY')
  if (secret) {
    router.post('/notifications', bearerTokenMiddleware(secret), publishNotificationHandler)

    router.get('/test-notifications', testRandomNotificationsHandler)
    router.get('/test-notifications/:notificationId', testNotificationPreviewHandler)
  }

  const setupWebSocketHandler = () =>
    setupWebSocketEventsHandler({
      components: {
        logs: globalContext.components.logs,
        uwsServer: globalContext.components.uwsServer,
        memoryCache: globalContext.components.memoryCache,
        broadcaster: globalContext.components.broadcaster
      }
    })

  // http://0.0.0.0:5002/test-notifications/8d2f7f24-f76f-4be7-a0ad-bf3b178c728a
  return { router, setupWebSocketHandler }
}
