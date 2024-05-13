import { NotificationChannelType, NotificationType, SubscriptionDetails } from '@dcl/schemas'

const allMessageTypes = Object.values(NotificationType).reduce(
  (properties, notificationType) => {
    properties[notificationType] = { email: true, in_app: true }
    return properties
  },
  {} as Record<NotificationType, NotificationChannelType>
)

const _defaultSubscription: SubscriptionDetails = {
  ignore_all_email: false,
  ignore_all_in_app: false,
  message_type: allMessageTypes
}

export function defaultSubscription() {
  return JSON.parse(JSON.stringify(_defaultSubscription))
}
