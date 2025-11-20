import { HandlerContextWithPath } from '../../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'

type NotificationOptOutResponse = {
  metadataKey: string
  metadataValue: string
  notificationTypes: string[] | null
}

export async function getNotificationOptOutsHandler(
  context: Pick<
    HandlerContextWithPath<'notificationOptOutsManager' | 'logs', '/subscription/opt-outs'>,
    'url' | 'components' | 'verification'
  >
): Promise<IHttpServerComponent.IResponse> {
  const address = context.verification!.auth

  const optOuts = await context.components.notificationOptOutsManager.getOptOuts(address)

  const response: NotificationOptOutResponse[] = optOuts.map((optOut) => ({
    metadataKey: optOut.metadata_key,
    metadataValue: optOut.metadata_value,
    notificationTypes: optOut.notification_types
  }))

  return {
    body: response
  }
}
