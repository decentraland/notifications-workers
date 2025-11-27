import { HandlerContextWithPath } from '../../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { NotificationScope } from '@notifications/common'

export async function deleteNotificationOptOutHandler(
  context: Pick<
    HandlerContextWithPath<'notificationOptOutsManager' | 'logs', '/subscription/opt-outs/:scope/:scopeId'>,
    'components' | 'verification' | 'params'
  >
): Promise<IHttpServerComponent.IResponse> {
  const logger = context.components.logs.getLogger('delete-notification-opt-out-handler')
  const address = context.verification!.auth
  const { scope, scopeId } = context.params as { scope: NotificationScope; scopeId: string }

  await context.components.notificationOptOutsManager.deleteOptOut(address, scope, scopeId)

  logger.info('Notification opt-out deleted', {
    address,
    scope,
    scopeId
  })

  return {
    status: 204
  }
}
