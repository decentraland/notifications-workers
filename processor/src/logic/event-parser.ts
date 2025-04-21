import { NotificationRecord } from '@notifications/common'
import { Event, Events, NotificationType } from '@dcl/schemas'
import { AppComponents, IEventParser } from '../types'
import { rewardNotificationTypeByEventSubtype } from './rewards-utils'
import { streamingNotificationTypeByEventSubtype } from './streaming-utils'

export async function createEventParser({
  logs,
  config
}: Pick<AppComponents, 'logs' | 'config'>): Promise<IEventParser> {
  const CDN_URL = await config.requireString('CDN_URL')
  const logger = logs.getLogger('event-parse')

  function parseToNotification(event: Event): NotificationRecord | undefined {
    logger.info(`Parse notification - type: ${event.type}, subtype: ${event.subType}, key: ${event.key}`)

    switch (event.subType) {
      case Events.SubType.Blockchain.ROYALTIES_EARNED:
        return {
          type: NotificationType.ROYALTIES_EARNED,
          address: event.metadata.address,
          eventKey: event.key,
          timestamp: event.timestamp,
          metadata: {
            image: event.metadata.image,
            category: event.metadata.category,
            rarity: event.metadata.rarity,
            link: event.metadata.link,
            nftName: event.metadata.nftName,
            title: event.metadata.title,
            description: event.metadata.description,
            royaltiesCut: event.metadata.royaltiesCut,
            royaltiesCollector: event.metadata.royaltiesCollector,
            network: event.metadata.network
          }
        }
      case Events.SubType.Blockchain.ITEM_SOLD:
        return {
          type: NotificationType.ITEM_SOLD,
          address: event.metadata.address,
          eventKey: event.key,
          timestamp: event.timestamp,
          metadata: {
            image: event.metadata.image,
            seller: event.metadata.seller,
            category: event.metadata.category,
            rarity: event.metadata.rarity,
            link: event.metadata.link,
            nftName: event.metadata.nftName,
            title: event.metadata.title,
            description: event.metadata.description,
            network: event.metadata.network
          }
        }
      case Events.SubType.Blockchain.BID_ACCEPTED:
        return {
          type: NotificationType.BID_ACCEPTED,
          address: event.metadata.address,
          eventKey: event.key,
          timestamp: event.timestamp,
          metadata: {
            image: event.metadata.image,
            seller: event.metadata.seller,
            category: event.metadata.category,
            rarity: event.metadata.rarity,
            link: event.metadata.link,
            nftName: event.metadata.nftName,
            price: event.metadata.price,
            title: event.metadata.title,
            description: event.metadata.description,
            network: event.metadata.network
          }
        }
      case Events.SubType.Marketplace.BID_RECEIVED:
        return {
          type: NotificationType.BID_RECEIVED,
          address: event.metadata.address,
          eventKey: event.key,
          timestamp: event.timestamp,
          metadata: {
            image: event.metadata.image,
            seller: event.metadata.seller,
            category: event.metadata.category,
            rarity: event.metadata.rarity,
            link: event.metadata.link,
            nftName: event.metadata.nftName,
            price: event.metadata.price,
            title: event.metadata.title,
            description: event.metadata.description,
            network: event.metadata.network
          }
        }
      case Events.SubType.Blockchain.RENTAL_ENDED:
        return {
          type: NotificationType.LAND_RENTAL_ENDED,
          address: event.metadata.address,
          eventKey: event.key,
          timestamp: event.timestamp,
          metadata: {
            contract: event.metadata.contract,
            lessor: event.metadata.lessor,
            tenant: event.metadata.tenant,
            operator: event.metadata.operator,
            startedAt: event.metadata.startedAt,
            endedAt: event.metadata.endedAt,
            tokenId: event.metadata.tokenId,
            link: event.metadata.link,
            title: event.metadata.title
          }
        }
      case Events.SubType.Blockchain.RENTAL_STARTED:
        return {
          type: NotificationType.LAND_RENTED,
          address: event.metadata.address,
          eventKey: event.key,
          timestamp: event.timestamp,
          metadata: {
            contract: event.metadata.contract,
            lessor: event.metadata.lessor,
            tenant: event.metadata.tenant,
            operator: event.metadata.operator,
            startedAt: event.metadata.startedAt,
            endedAt: event.metadata.endedAt,
            tokenId: event.metadata.tokenId,
            link: event.metadata.link,
            title: event.metadata.title
          }
        }
      case Events.SubType.Badge.GRANTED:
        return {
          type: NotificationType.BADGE_GRANTED,
          address: event.metadata.address,
          eventKey: event.key,
          timestamp: event.timestamp,
          metadata: {
            id: event.metadata.badgeId,
            title: 'New Badge Unlocked!',
            description: event.metadata.badgeTierName
              ? `${event.metadata.badgeName} ${event.metadata.badgeTierName}`
              : event.metadata.badgeName,
            image: event.metadata.badgeImageUrl
          }
        }
      case Events.SubType.Rewards.REWARD_ASSIGNED:
      case Events.SubType.Rewards.REWARD_IN_PROGRESS:
      case Events.SubType.Rewards.REWARD_DELAYED:
        return {
          type: rewardNotificationTypeByEventSubtype(event.subType),
          address: event.metadata.beneficiary,
          eventKey: event.key,
          timestamp: event.timestamp,
          metadata: {
            title: event.metadata.title,
            description: event.metadata.description,
            tokenName: event.metadata.tokenName,
            tokenImage: event.metadata.tokenImage,
            tokenRarity: event.metadata.tokenRarity,
            tokenCategory: event.metadata.tokenCategory,
            link: event.metadata.link
          }
        }
      case Events.SubType.Rewards.CAMPAIGN_OUT_OF_FUNDS:
      case Events.SubType.Rewards.CAMPAIGN_OUT_OF_STOCK:
      case Events.SubType.Rewards.CAMPAIGN_GAS_PRICE_HIGHER_THAN_EXPECTED:
        return {
          type: rewardNotificationTypeByEventSubtype(event.subType),
          address: event.metadata.owner,
          eventKey: event.key,
          timestamp: event.timestamp,
          metadata: {
            title: event.metadata.title,
            description: event.metadata.description,
            campaignId: event.metadata.campaignId,
            campaignName: event.metadata.campaignName,
            link: event.metadata.link
          }
        }
      case Events.SubType.SocialService.FRIENDSHIP_REQUEST:
        return {
          type: NotificationType.SOCIAL_SERVICE_FRIENDSHIP_REQUEST,
          address: event.metadata.receiver.address,
          eventKey: event.key,
          timestamp: event.timestamp,
          metadata: {
            requestId: event.metadata.requestId,
            sender: {
              address: event.metadata.sender.address,
              name: event.metadata.sender.name,
              profileImageUrl: event.metadata.sender.profileImageUrl,
              hasClaimedName: event.metadata.sender.hasClaimedName
            },
            receiver: {
              address: event.metadata.receiver.address,
              name: event.metadata.receiver.name,
              profileImageUrl: event.metadata.receiver.profileImageUrl,
              hasClaimedName: event.metadata.receiver.hasClaimedName
            },
            message: event.metadata.message
          }
        }
      case Events.SubType.SocialService.FRIENDSHIP_ACCEPTED:
        return {
          type: NotificationType.SOCIAL_SERVICE_FRIENDSHIP_ACCEPTED,
          address: event.metadata.receiver.address,
          eventKey: event.key,
          timestamp: event.timestamp,
          metadata: {
            requestId: event.metadata.requestId,
            sender: {
              address: event.metadata.sender.address,
              name: event.metadata.sender.name,
              profileImageUrl: event.metadata.sender.profileImageUrl,
              hasClaimedName: event.metadata.sender.hasClaimedName
            },
            receiver: {
              address: event.metadata.receiver.address,
              name: event.metadata.receiver.name,
              profileImageUrl: event.metadata.receiver.profileImageUrl,
              hasClaimedName: event.metadata.receiver.hasClaimedName
            }
          }
        }
      case Events.SubType.CreditsService.CREDITS_GOAL_COMPLETED:
        return {
          type: NotificationType.CREDITS_GOAL_COMPLETED,
          address: event.metadata.address,
          eventKey: event.key,
          timestamp: event.timestamp,
          metadata: {
            goalId: event.metadata.goalId,
            creditsObtained: event.metadata.creditsObtained,
            image: `${CDN_URL}credits/notification-icon.png`,
            title: 'Weekly Goal Completed!',
            description: 'Claim your Credits to unlock them'
          }
        }

      case Events.SubType.Streaming.STREAMING_KEY_RESET:
      case Events.SubType.Streaming.STREAMING_KEY_REVOKE:
      case Events.SubType.Streaming.STREAMING_KEY_EXPIRED:
      case Events.SubType.Streaming.STREAMING_TIME_EXCEEDED:
      case Events.SubType.Streaming.STREAMING_PLACE_UPDATED:
        return {
          type: streamingNotificationTypeByEventSubtype(event.subType),
          address: event.metadata.address,
          eventKey: event.key,
          timestamp: event.timestamp,
          metadata: {
            title: event.metadata.title,
            description: event.metadata.description,
            position: event.metadata.position,
            worldName: event.metadata.worldName,
            isWorld: event.metadata.isWorld,
            url: event.metadata.url
          }
        }
      default:
        return undefined
    }
  }

  return { parseToNotification }
}
