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

  await context.components.notificationOptOutsManager.createOptOut(address, body.entity, body.entityId)

  logger.info('Notification opt-out created', {
    address,
    entity: body.entity,
    entityId: body.entityId
  })

  return {
    status: 201,
    body: {
      entity: body.entity,
      entityId: body.entityId,
      optedOut: true
    }
  }
}
