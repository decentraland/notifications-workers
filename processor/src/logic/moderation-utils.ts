import { Events, NotificationType } from '@dcl/schemas'

const MODERATION_NOTIFICATIONS_TYPE_BY_EVENT_SUBTYPE: Record<
  Events.SubType.Moderation.USER_BAN_CREATED | Events.SubType.Moderation.USER_WARNING_CREATED,
  NotificationType
> = {
  [Events.SubType.Moderation.USER_BAN_CREATED]: NotificationType.BANNED,
  [Events.SubType.Moderation.USER_WARNING_CREATED]: NotificationType.BAN_WARNING
}

export function moderationNotificationTypeByEventSubtype(
  subtype: Events.SubType.Moderation.USER_BAN_CREATED | Events.SubType.Moderation.USER_WARNING_CREATED
): NotificationType {
  return MODERATION_NOTIFICATIONS_TYPE_BY_EVENT_SUBTYPE[subtype]
}
