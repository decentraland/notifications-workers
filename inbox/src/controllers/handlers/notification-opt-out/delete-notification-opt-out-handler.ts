import { HandlerContextWithPath } from '../../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { NotificationEntity } from '@notifications/common'

export async function deleteNotificationOptOutHandler(
  context: Pick<
    HandlerContextWithPath<'notificationOptOutsManager' | 'logs', '/subscription/opt-outs/:entity/:entityId'>,
    'components' | 'verification' | 'params'
  >
): Promise<IHttpServerComponent.IResponse> {
  const logger = context.components.logs.getLogger('delete-notification-opt-out-handler')
  const address = context.verification!.auth
  const { entity, entityId } = context.params as { entity: NotificationEntity; entityId: string }

  await context.components.notificationOptOutsManager.deleteOptOut(address, entity, entityId)

  logger.info('Notification opt-out deleted', {
    address,
    entity,
    entityId
  })

  return {
    status: 204
  }
}
