import { Events, NotificationType } from '@dcl/schemas'

const MODERATION_NOTIFICATIONS_TYPE_BY_EVENT_SUBTYPE: Record<
  | Events.SubType.Moderation.USER_BAN_CREATED
  | Events.SubType.Moderation.USER_WARNING_CREATED
  | Events.SubType.Moderation.USER_BAN_LIFTED,
  NotificationType
> = {
  [Events.SubType.Moderation.USER_BAN_CREATED]: NotificationType.BANNED,
  [Events.SubType.Moderation.USER_WARNING_CREATED]: NotificationType.BAN_WARNING,
  [Events.SubType.Moderation.USER_BAN_LIFTED]: NotificationType.BAN_LIFTED
}

export function moderationNotificationTypeByEventSubtype(
  subtype:
    | Events.SubType.Moderation.USER_BAN_CREATED
    | Events.SubType.Moderation.USER_WARNING_CREATED
    | Events.SubType.Moderation.USER_BAN_LIFTED
): NotificationType {
  return MODERATION_NOTIFICATIONS_TYPE_BY_EVENT_SUBTYPE[subtype]
}
