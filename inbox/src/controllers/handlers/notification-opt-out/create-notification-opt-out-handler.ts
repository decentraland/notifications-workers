import { HandlerContextWithPath } from '../../../types'
import { IHttpServerComponent } from '@dcl/core-commons'
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

  await context.components.notificationOptOutsManager.createOptOut(address, body.scope, body.scopeId)

  logger.info('Notification opt-out created', {
    address,
    scope: body.scope,
    scopeId: body.scopeId
  })

  return {
    status: 201,
    body: {
      scope: body.scope,
      scopeId: body.scopeId,
      optedOut: true
    }
  }
}
