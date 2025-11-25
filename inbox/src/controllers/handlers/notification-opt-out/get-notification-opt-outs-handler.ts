import { HandlerContextWithPath } from '../../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'

type NotificationOptOutResponse = {
  metadataKey: string
  metadataValue: string
  notificationTypes: string[]
}

export async function getNotificationOptOutsHandler(
  context: Pick<
    HandlerContextWithPath<'notificationOptOutsManager' | 'logs', '/subscription/opt-outs'>,
    'url' | 'components' | 'verification'
  >
): Promise<IHttpServerComponent.IResponse> {
  const address = context.verification!.auth

  const optOuts = await context.components.notificationOptOutsManager.getOptOuts(address)

  // Group by metadata_key and metadata_value
  const grouped = new Map<string, NotificationOptOutResponse>()
  for (const optOut of optOuts) {
    const key = `${optOut.metadata_key}:${optOut.metadata_value}`
    if (!grouped.has(key)) {
      grouped.set(key, {
        metadataKey: optOut.metadata_key,
        metadataValue: optOut.metadata_value,
        notificationTypes: []
      })
    }
    grouped.get(key)!.notificationTypes.push(optOut.notification_type)
  }

  const response: NotificationOptOutResponse[] = Array.from(grouped.values())

  return {
    body: response
  }
}
