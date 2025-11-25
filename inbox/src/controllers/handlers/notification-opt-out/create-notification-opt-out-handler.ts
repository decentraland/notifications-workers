import { HandlerContextWithPath } from '../../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { CreateNotificationOptOutRequestBody } from './schemas'

export async function createNotificationOptOutHandler(
  context: Pick<
    HandlerContextWithPath<'notificationOptOutsManager' | 'logs', '/subscription/opt-outs'>,
    'url' | 'request' | 'components' | 'verification'
  >
): Promise<IHttpServerComponent.IResponse> {
  const logger = context.components.logs.getLogger('create-notification-opt-out-handler')
  const address = context.verification!.auth
  const body: CreateNotificationOptOutRequestBody = await context.request.json()

  const optOuts = await context.components.notificationOptOutsManager.createOptOut(
    address,
    body.metadataKey,
    body.metadataValue,
    body.notificationTypes
  )

  logger.info('Notification opt-out created', {
    address,
    metadataKey: body.metadataKey,
    metadataValue: body.metadataValue,
    notificationTypesCount: body.notificationTypes.length
  })

  // Group by metadata_key and metadata_value, extract notification types
  const notificationTypes = optOuts.map((optOut) => optOut.notification_type)

  return {
    status: 201,
    body: {
      metadataKey: body.metadataKey,
      metadataValue: body.metadataValue,
      notificationTypes
    }
  }
}
