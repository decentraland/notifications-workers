import { Router } from '@dcl/http-server'
import { statusHandler } from './handlers/status-handler'
import { notificationsHandler } from './handlers/notifications-handler'
import { bearerTokenMiddleware, errorHandler, NotAuthorizedError } from '@dcl/http-commons'
import { rejectIfSigner, wellKnownComponents } from '@dcl/crypto-middleware'
import { GlobalContext } from '../types'
import { readNotificationsHandler } from './handlers/read-notifications-handler'
import { getSubscriptionHandler } from './handlers/get-subscription-handler'
import { putSubscriptionHandler } from './handlers/put-subscription-handler'
import { confirmEmailHandler, storeUnconfirmedEmailHandler } from './handlers/unconfirmed-email-handlers'
import { unsubscribeAllHandler, unsubscribeOneHandler } from './handlers/unsubscription-handlers'
import {
  createNotificationOptOutHandler,
  deleteNotificationOptOutHandler,
  getNotificationOptOutsHandler,
  CreateNotificationOptOutSchema
} from './handlers/notification-opt-out'
import { IHttpServerComponent } from '@dcl/core-commons'
import { hasValidSignature } from '@notifications/common'
import { commonEmailHandler } from './handlers/common-email-handlers'

const FIVE_MINUTES = 5 * 60 * 1000

/**
 * Metadata keys this service authorizes on, in their canonical spelling.
 *
 * Declaring them opts the routes below into accepting requests still signed with the pre-6.0.0
 * payload, which folded the whole joined string before signing while delivering the metadata header
 * verbatim. Since 6.0.0 the metadata bytes are signed as delivered, so the two disagree for any
 * metadata carrying uppercase -- and every current caller sends some. `PUT /notifications/read`
 * carries `notificationIds`, so decentraland-dapps (builder, marketplace, profile, account) and
 * godot-explorer get a 401 on every call without this.
 *
 * Only `signer` is declared, and it is not read by a handler: it is what `rejectIfSigner` gates on,
 * and the fold leaves key casing outside the signature, so a legacy request could otherwise deliver
 * `Signer` and have the gate read the field as absent.
 *
 * Nothing else belongs here. No handler in this service reads `authMetadata` at all --
 * `readNotificationsHandler` takes `notificationIds` from the request body and the address from the
 * recovered signature -- so no other key can change an authorization outcome, and declaring one
 * would describe a boundary this service does not enforce.
 *
 * Removable once every caller signs the 6.x payload.
 */
const CANONICAL_METADATA_KEYS = ['signer']

// We return the entire router because it will be easier to test than a whole server
export async function setupRouter({ components }: GlobalContext): Promise<Router<GlobalContext>> {
  const router = new Router<GlobalContext>()

  const { config, fetch } = components

  const signingKey = await config.requireString('SIGNING_KEY')

  const signedFetchMiddleware = wellKnownComponents({
    fetcher: fetch,
    optional: false,
    expiration: FIVE_MINUTES,
    metadataValidator: rejectIfSigner('decentraland-kernel-scene'),
    canonicalMetadataKeys: CANONICAL_METADATA_KEYS,
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

  const secret = await components.config.requireString('NOTIFICATION_SERVICE_TOKEN')

  router.use(errorHandler)

  router.get('/status', statusHandler)

  router.get('/notifications', signedFetchMiddleware, notificationsHandler)
  router.put('/notifications/read', signedFetchMiddleware, readNotificationsHandler)

  router.get('/subscription', signedFetchMiddleware, getSubscriptionHandler)
  router.put('/subscription', signedFetchMiddleware, putSubscriptionHandler)

  router.get('/subscription/opt-outs/:scope/:scopeId', signedFetchMiddleware, getNotificationOptOutsHandler)
  router.post(
    '/subscription/opt-outs',
    signedFetchMiddleware,
    components.schemaValidator.withSchemaValidatorMiddleware(CreateNotificationOptOutSchema),
    createNotificationOptOutHandler
  )
  router.delete('/subscription/opt-outs/:scope/:scopeId', signedFetchMiddleware, deleteNotificationOptOutHandler)

  router.get('/unsubscribe/:address', signedUrlMiddleware, unsubscribeAllHandler)
  router.get('/unsubscribe/:address/:notificationType', signedUrlMiddleware, unsubscribeOneHandler)

  router.put('/set-email', signedFetchMiddleware, storeUnconfirmedEmailHandler)
  router.put('/confirm-email', confirmEmailHandler)
  router.post('/notifications/email', bearerTokenMiddleware(secret), commonEmailHandler)

  return router
}
