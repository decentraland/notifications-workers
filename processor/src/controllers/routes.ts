import { Router } from '@well-known-components/http-server'
import { sendNotificationsToSqsHandler } from './handlers/publish-handler'
import { ProcessorGlobalContext } from '../types'

// We return the entire router because it will be easier to test than a whole server
export async function setupRouter(_: ProcessorGlobalContext): Promise<Router<ProcessorGlobalContext>> {
  const router = new Router<ProcessorGlobalContext>()

  router.post('/notifications', sendNotificationsToSqsHandler)

  return router
}
