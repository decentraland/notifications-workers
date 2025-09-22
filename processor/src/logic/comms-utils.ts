import { Events, NotificationType } from '@dcl/schemas'

const COMMS_NOTIFICATIONS_TYPE_BY_EVENT_SUBTYPE: Record<
  Events.SubType.Comms.USER_BANNED_FROM_SCENE | Events.SubType.Comms.USER_UNBANNED_FROM_SCENE,
  NotificationType
> = {
  [Events.SubType.Comms.USER_BANNED_FROM_SCENE]: NotificationType.USER_BANNED_FROM_SCENE,
  [Events.SubType.Comms.USER_UNBANNED_FROM_SCENE]: NotificationType.USER_UNBANNED_FROM_SCENE
}

export function commsNotificationTypeByEventSubtype(
  subtype: Events.SubType.Comms.USER_BANNED_FROM_SCENE | Events.SubType.Comms.USER_UNBANNED_FROM_SCENE
): NotificationType {
  return COMMS_NOTIFICATIONS_TYPE_BY_EVENT_SUBTYPE[subtype]
}
