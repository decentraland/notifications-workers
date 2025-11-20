import { HandlerContextWithPath } from '../../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { InvalidRequestError } from '@dcl/platform-server-commons'
import { UpdateNotificationOptOutRequestBody } from './schemas'

export async function updateNotificationOptOutHandler(
  context: Pick<
    HandlerContextWithPath<'notificationOptOutsManager' | 'logs', '/subscription/opt-outs/:metadataKey/:metadataValue'>,
    'url' | 'components' | 'verification' | 'params' | 'request'
  >
): Promise<IHttpServerComponent.IResponse> {
  const logger = context.components.logs.getLogger('update-notification-opt-out-handler')
  const address = context.verification!.auth
  const metadataKey = context.params.metadataKey
  const metadataValue = decodeURIComponent(context.params.metadataValue)
  const body: UpdateNotificationOptOutRequestBody = await context.request.json()

  if (!metadataKey || !metadataValue) {
    logger.warn(`Invalid opt-out update request: missing metadataKey or metadataValue`)
    throw new InvalidRequestError('Invalid opt-out update request. metadataKey and metadataValue are required.')
  }

  try {
    const optOut = await context.components.notificationOptOutsManager.updateOptOut(
      address,
      metadataKey,
      metadataValue,
      body.notificationTypes
    )

    logger.info('Notification opt-out updated', {
      address,
      metadataKey,
      metadataValue
    })

    return {
      status: 200,
      body: {
        metadataKey: optOut.metadata_key,
        metadataValue: optOut.metadata_value,
        notificationTypes: optOut.notification_types
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      logger.warn(`Opt-out not found: ${metadataKey}/${metadataValue} for address ${address}`)
      throw new InvalidRequestError('Opt-out not found.')
    }
    throw error
  }
}
