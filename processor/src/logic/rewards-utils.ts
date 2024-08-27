import { Events, NotificationType } from '@dcl/schemas'

const REWARDS_NOTIFICATIONS_TYPE_BY_EVENT_SUBTYPE: Record<Events.SubType.Rewards, NotificationType> = {
  [Events.SubType.Rewards.REWARD_ASSIGNED]: NotificationType.REWARD_ASSIGNED,
  [Events.SubType.Rewards.REWARD_IN_PROGRESS]: NotificationType.REWARD_IN_PROGRESS,
  [Events.SubType.Rewards.REWARD_DELAYED]: NotificationType.REWARD_DELAYED,
  [Events.SubType.Rewards.CAMPAIGN_OUT_OF_FUNDS]: NotificationType.REWARD_CAMPAIGN_OUT_OF_FUNDS,
  [Events.SubType.Rewards.CAMPAIGN_OUT_OF_STOCK]: NotificationType.REWARD_CAMPAIGN_OUT_OF_STOCK,
  [Events.SubType.Rewards.CAMPAIGN_GAS_PRICE_HIGHER_THAN_EXPECTED]:
    NotificationType.REWARD_CAMPAIGN_GAS_PRICE_HIGHER_THAN_EXPECTED
}

export function rewardNotificationTypeByEventSubtype(subtype: Events.SubType.Rewards): NotificationType {
  return REWARDS_NOTIFICATIONS_TYPE_BY_EVENT_SUBTYPE[subtype]
}
