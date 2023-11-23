import { Router } from '@well-known-components/http-server'
import { sendNotificationsToSqsHandler } from './handlers/publish-handler'
import { GlobalContext } from '../types'
import { errorHandler } from '@notifications/commons'

// We return the entire router because it will be easier to test than a whole server
export async function setupRouter(_: GlobalContext): Promise<Router<GlobalContext>> {
  const router = new Router<GlobalContext>()
  router.use(errorHandler)

  router.post('/notifications', sendNotificationsToSqsHandler)

  return router
}
