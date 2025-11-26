import { HandlerContextWithPath } from '../../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { InvalidRequestError } from '@dcl/platform-server-commons'
import { NotificationType } from '@dcl/schemas'

const NOTIFICATION_TYPES = new Set(Object.values(NotificationType))
type DeleteNotificationOptOutParams = {
  metadataKey: string
  metadataValue: string
  notificationType?: string
}

export async function deleteNotificationOptOutHandler(
  context: Pick<
    HandlerContextWithPath<
      'notificationOptOutsManager' | 'logs',
      | '/subscription/opt-outs/:metadataKey/:metadataValue'
      | '/subscription/opt-outs/:metadataKey/:metadataValue/:notificationType'
    >,
    'components' | 'verification' | 'params'
  >
): Promise<IHttpServerComponent.IResponse> {
  const logger = context.components.logs.getLogger('delete-notification-opt-out-handler')
  const address = context.verification!.auth
  const params = context.params as DeleteNotificationOptOutParams
  const metadataKey = params.metadataKey
  const metadataValue = decodeURIComponent(params.metadataValue)
  const rawNotificationType = params.notificationType
  const notificationType = rawNotificationType && rawNotificationType !== '' ? rawNotificationType : undefined
  const notificationTypeValue = notificationType as NotificationType | undefined

  if (notificationType !== undefined && !NOTIFICATION_TYPES.has(notificationTypeValue!)) {
    logger.warn('Invalid notificationType requested', {
      notificationType
    })
    throw new InvalidRequestError('Invalid notificationType')
  }

  if (!metadataKey || !metadataValue) {
    logger.warn(`Invalid opt-out deletion request: missing metadataKey or metadataValue`)
    throw new InvalidRequestError('Invalid opt-out deletion request. metadataKey and metadataValue are required.')
  }

  await context.components.notificationOptOutsManager.deleteOptOut(
    address,
    metadataKey,
    metadataValue,
    notificationType
  )

  logger.info('Notification opt-out deleted', {
    address,
    metadataKey,
    metadataValue,
    ...(notificationType && { notificationType })
  })

  return {
    status: 204
  }
}
