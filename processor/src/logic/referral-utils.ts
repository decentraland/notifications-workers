import { Events, NotificationType } from '@dcl/schemas'

const REFERRAL_NOTIFICATIONS_TYPE_BY_EVENT_SUBTYPE: Record<Events.SubType.Referral, NotificationType> = {
  [Events.SubType.Referral.REFERRAL_INVITED_USERS_ACCEPTED]: NotificationType.REFERRAL_INVITED_USERS_ACCEPTED,
  [Events.SubType.Referral.REFERRAL_NEW_TIER_REACHED]: NotificationType.REFERRAL_NEW_TIER_REACHED
}

export function referralNotificationTypeByEventSubtype(subtype: Events.SubType.Referral): NotificationType {
  return REFERRAL_NOTIFICATIONS_TYPE_BY_EVENT_SUBTYPE[subtype]
}
