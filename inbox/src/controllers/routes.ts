import { Router } from '@well-known-components/http-server'
import { statusHandler } from './handlers/status-handler'
import { notificationsHandler } from './handlers/notifications-handler'
import { errorHandler, NotAuthorizedError } from '@dcl/platform-server-commons'
import { wellKnownComponents } from '@dcl/platform-crypto-middleware'
import { GlobalContext } from '../types'
import { readNotificationsHandler } from './handlers/read-notifications-handler'
import { getSubscriptionHandler } from './handlers/get-subscription-handler'
import { putSubscriptionHandler } from './handlers/put-subscription-handler'
import { confirmEmailHandler, storeUnconfirmedEmailHandler } from './handlers/unconfirmed-email-handlers'
import { unsubscribeAllHandler, unsubscribeOneHandler } from './handlers/unsubscription-handlers'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { hasValidSignature } from '@notifications/common'

const FIVE_MINUTES = 5 * 60 * 1000

// We return the entire router because it will be easier to test than a whole server
export async function setupRouter({ components }: GlobalContext): Promise<Router<GlobalContext>> {
  const router = new Router<GlobalContext>()

  const { config, fetch } = components

  const signingKey = await config.requireString('SIGNING_KEY')

  const signedFetchMiddleware = wellKnownComponents({
    fetcher: fetch,
    optional: false,
    expiration: FIVE_MINUTES,
    metadataValidator: (metadata: Record<string, any>): boolean => metadata.signer !== 'decentraland-kernel-scene',
    onError: (err: any) => ({
      error: err.message,
      message: 'This endpoint requires a signed fetch request. See ADR-44.'
    })
  })

  const signedUrlMiddleware = async (
    ctx: IHttpServerComponent.DefaultContext<any>,
    next: () => Promise<IHttpServerComponent.IResponse>
  ): Promise<IHttpServerComponent.IResponse> => {
    if (!hasValidSignature(signingKey, ctx.url)) {
      throw new NotAuthorizedError('Invalid URL.')
    }

    return next()
  }

  router.use(errorHandler)

  router.get('/status', statusHandler)

  router.get('/notifications', signedFetchMiddleware, notificationsHandler)
  router.put('/notifications/read', signedFetchMiddleware, readNotificationsHandler)

  router.get('/subscription', signedFetchMiddleware, getSubscriptionHandler)
  router.put('/subscription', signedFetchMiddleware, putSubscriptionHandler)
  router.get('/unsubscribe/:address', signedUrlMiddleware, unsubscribeAllHandler)
  router.get('/unsubscribe/:address/:notificationType', signedUrlMiddleware, unsubscribeOneHandler)

  router.put('/set-email', signedFetchMiddleware, storeUnconfirmedEmailHandler)
  router.put('/confirm-email', confirmEmailHandler)

  return router
}
