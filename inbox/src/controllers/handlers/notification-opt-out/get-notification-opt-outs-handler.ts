import { HandlerContextWithPath } from '../../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { NotificationEntityType } from '@notifications/common'
import { InvalidRequestError } from '@dcl/platform-server-commons'

export async function getNotificationOptOutsHandler(
  context: Pick<
    HandlerContextWithPath<'notificationOptOutsManager' | 'logs', '/subscription/opt-outs/:entity/:entityId'>,
    'components' | 'verification' | 'params'
  >
): Promise<IHttpServerComponent.IResponse> {
  const address = context.verification!.auth
  const { entity, entityId } = context.params

  if (!Object.values(NotificationEntityType).includes(entity as NotificationEntityType)) {
    throw new InvalidRequestError('Invalid entity')
  }

  const notificationEntityType = entity as NotificationEntityType

  const optedOut = await context.components.notificationOptOutsManager.hasOptOut(
    address,
    notificationEntityType,
    entityId
  )

  return {
    body: {
      entity,
      entityId,
      optedOut
    }
  }
}
