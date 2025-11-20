import { HandlerContextWithPath } from '../../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { InvalidRequestError } from '@dcl/platform-server-commons'

export async function deleteNotificationOptOutHandler(
  context: Pick<
    HandlerContextWithPath<'notificationOptOutsManager' | 'logs', '/subscription/opt-outs/:metadataKey/:metadataValue'>,
    'url' | 'components' | 'verification' | 'params'
  >
): Promise<IHttpServerComponent.IResponse> {
  const logger = context.components.logs.getLogger('delete-notification-opt-out-handler')
  const address = context.verification!.auth
  const metadataKey = context.params.metadataKey
  const metadataValue = decodeURIComponent(context.params.metadataValue)

  if (!metadataKey || !metadataValue) {
    logger.warn(`Invalid opt-out deletion request: missing metadataKey or metadataValue`)
    throw new InvalidRequestError('Invalid opt-out deletion request. metadataKey and metadataValue are required.')
  }

  await context.components.notificationOptOutsManager.deleteOptOut(address, metadataKey, metadataValue)

  logger.info('Notification opt-out deleted', {
    address,
    metadataKey,
    metadataValue
  })

  return {
    status: 204
  }
}
