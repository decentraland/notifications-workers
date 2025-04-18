import { Events, NotificationType } from '@dcl/schemas'

const STREAMING_NOTIFICATIONS_TYPE_BY_EVENT_SUBTYPE: Record<Events.SubType.Streaming, NotificationType> = {
  [Events.SubType.Streaming.STREAMING_KEY_RESET]: NotificationType.STREAMING_KEY_RESET,
  [Events.SubType.Streaming.STREAMING_KEY_REVOKE]: NotificationType.STREAMING_KEY_REVOKE,
  [Events.SubType.Streaming.STREAMING_KEY_EXPIRED]: NotificationType.STREAMING_KEY_EXPIRED,
  [Events.SubType.Streaming.STREAMING_TIME_EXCEEDED]: NotificationType.STREAMING_TIME_EXCEEDED,
  [Events.SubType.Streaming.STREAMING_PLACE_UPDATED]: NotificationType.STREAMING_PLACE_UPDATED
}

export function streamingNotificationTypeByEventSubtype(subtype: Events.SubType.Streaming): NotificationType {
  return STREAMING_NOTIFICATIONS_TYPE_BY_EVENT_SUBTYPE[subtype]
}
