import { HandlerContextWithPath } from '../../../types'
import { IHttpServerComponent } from '@dcl/core-commons'
import { NotificationScope } from '@notifications/common'
import { InvalidRequestError } from '@dcl/http-commons'

export async function getNotificationOptOutsHandler(
  context: Pick<
    HandlerContextWithPath<'notificationOptOutsManager' | 'logs', '/subscription/opt-outs/:scope/:scopeId'>,
    'components' | 'verification' | 'params'
  >
): Promise<IHttpServerComponent.IResponse> {
  const address = context.verification!.auth
  const { scope, scopeId } = context.params

  if (!Object.values(NotificationScope).includes(scope as NotificationScope)) {
    throw new InvalidRequestError('Invalid scope')
  }

  const optedOut = await context.components.notificationOptOutsManager.hasOptOut(
    address,
    scope as NotificationScope,
    scopeId
  )

  return {
    body: {
      scope,
      scopeId,
      optedOut
    }
  }
}
