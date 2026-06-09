import { NotificationScope, NotificationRecord } from '@notifications/common'
import { EthAddress, Event, Events, NotificationType } from '@dcl/schemas'
import { AppComponents, IEventParser } from '../types'
import { rewardNotificationTypeByEventSubtype } from './rewards-utils'
import { streamingNotificationTypeByEventSubtype } from './streaming-utils'
import { referralNotificationTypeByEventSubtype } from './referral-utils'
import { commsNotificationTypeByEventSubtype } from './comms-utils'
import { moderationNotificationTypeByEventSubtype } from './moderation-utils'

export async function createEventParser({
  logs,
  config
}: Pick<AppComponents, 'logs' | 'config'>): Promise<IEventParser> {
  const CDN_URL = await config.requireString('CDN_URL')
  const DECENTRALAND_URL = (await config.getString('DECENTRALAND_URL')) || 'https://decentraland.org'
  const logger = logs.getLogger('event-parse')

  function parseToNotifications(event: Event): NotificationRecord[] {
    logger.info(`Parse notification - type: ${event.type}, subtype: ${event.subType}, key: ${event.key}`)

    switch (event.subType) {
      case Events.SubType.Blockchain.ROYALTIES_EARNED:
        return [
          {
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
        ]
      case Events.SubType.Blockchain.ITEM_SOLD:
        return [
          {
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
        ]
      case Events.SubType.Blockchain.BID_ACCEPTED:
        return [
          {
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
        ]
      case Events.SubType.Marketplace.BID_RECEIVED:
        return [
          {
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
        ]
      case Events.SubType.Blockchain.RENTAL_ENDED:
        return [
          {
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
        ]
      case Events.SubType.Blockchain.RENTAL_STARTED:
        return [
          {
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
        ]
      case Events.SubType.Blockchain.TRANSFER_RECEIVED:
        return [
          {
            type: NotificationType.TRANSFER_RECEIVED,
            address: event.metadata.receiverAddress,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              senderAddress: event.metadata.senderAddress,
              receiverAddress: event.metadata.receiverAddress,
              tokenUri: event.metadata.tokenUri
            }
          }
        ]
      case Events.SubType.Blockchain.TIP_RECEIVED:
        return [
          {
            type: NotificationType.TIP_RECEIVED,
            address: event.metadata.receiverAddress,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              amount: event.metadata.amount,
              // NOTE: 'manaAmount' is included for UI2 compatibility, but 'amount' should be the latest field according to TipNotificationMetadataProps.
              // TODO: Confirm with UI2 team if 'manaAmount' can be removed.
              manaAmount: (Number(event.metadata.amount) * 1e18).toString(),
              senderAddress: event.metadata.senderAddress,
              receiverAddress: event.metadata.receiverAddress
            }
          }
        ]
      case Events.SubType.Badge.GRANTED:
        return [
          {
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
        ]
      case Events.SubType.Rewards.REWARD_ASSIGNED:
      case Events.SubType.Rewards.REWARD_IN_PROGRESS:
      case Events.SubType.Rewards.REWARD_DELAYED:
        return [
          {
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
        ]
      case Events.SubType.Rewards.CAMPAIGN_OUT_OF_FUNDS:
      case Events.SubType.Rewards.CAMPAIGN_OUT_OF_STOCK:
      case Events.SubType.Rewards.CAMPAIGN_GAS_PRICE_HIGHER_THAN_EXPECTED:
        return [
          {
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
        ]
      case Events.SubType.SocialService.FRIENDSHIP_REQUEST:
        return [
          {
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
        ]
      case Events.SubType.SocialService.FRIENDSHIP_ACCEPTED:
        return [
          {
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
        ]
      case Events.SubType.Streaming.STREAMING_KEY_RESET:
      case Events.SubType.Streaming.STREAMING_KEY_REVOKE:
      case Events.SubType.Streaming.STREAMING_KEY_EXPIRED:
      case Events.SubType.Streaming.STREAMING_TIME_EXCEEDED:
      case Events.SubType.Streaming.STREAMING_PLACE_UPDATED:
        return [
          {
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
              url: event.metadata.url,
              image: event.metadata.image
            }
          }
        ]
      case Events.SubType.CreditsService.CREDITS_GOAL_COMPLETED:
        return [
          {
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
        ]
      case Events.SubType.CreditsService.ON_DEMAND_CREDITS_GRANTED:
        return [
          {
            type: NotificationType.CREDITS_ON_DEMAND_GRANTED,
            address: event.metadata.address,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              creditsGranted: event.metadata.creditsGranted,
              image: `${CDN_URL}credits/notification-icon.png`,
              title: 'Bonus credits unlocked',
              description:
                "Congrats! You've earned extra Credits for this season. Make sure to use them before they expire!",
              link: `${DECENTRALAND_URL}/marketplace`
            }
          }
        ]
      case Events.SubType.CreditsService.COMPLETE_GOALS_REMINDER:
        return [
          {
            type: NotificationType.CREDITS_REMINDER_COMPLETE_GOALS,
            address: event.metadata.address,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              seasonId: event.metadata.seasonId,
              weekNumber: event.metadata.weekNumber,
              pendingGoalIds: event.metadata.pendingGoalIds,
              link: `${DECENTRALAND_URL}/play`
            }
          }
        ]
      case Events.SubType.CreditsService.CLAIM_CREDITS_REMINDER:
        return [
          {
            type: NotificationType.CREDITS_REMINDER_CLAIM_CREDITS,
            address: event.metadata.address,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              seasonId: event.metadata.seasonId,
              weekNumber: event.metadata.weekNumber,
              link: `${DECENTRALAND_URL}/play`
            }
          }
        ]
      case Events.SubType.CreditsService.DO_NOT_MISS_OUT_REMINDER:
        return [
          {
            type: NotificationType.CREDITS_REMINDER_DO_NOT_MISS_OUT,
            address: event.metadata.address,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              link: `${DECENTRALAND_URL}/play`
            }
          }
        ]
      case Events.SubType.CreditsService.USAGE_24_HOURS_REMINDER:
        return [
          {
            type: NotificationType.CREDITS_REMINDER_USAGE_24_HOURS,
            address: event.metadata.address,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              expirationDate: event.metadata.expirationDate,
              balance: event.metadata.creditsAmount,
              link: `${DECENTRALAND_URL}/marketplace`
            }
          }
        ]
      case Events.SubType.CreditsService.USAGE_REMINDER:
        return [
          {
            type: NotificationType.CREDITS_REMINDER_USAGE,
            address: event.metadata.address,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              expirationDate: event.metadata.expirationDate,
              expirationDay: event.metadata.expirationDay,
              balance: event.metadata.creditsAmount,
              link: `${DECENTRALAND_URL}/marketplace`
            }
          }
        ]
      case Events.SubType.Referral.REFERRAL_INVITED_USERS_ACCEPTED:
      case Events.SubType.Referral.REFERRAL_NEW_TIER_REACHED:
        return [
          {
            type: referralNotificationTypeByEventSubtype(event.subType),
            address: event.metadata.address,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              title: event.metadata.title,
              description: event.metadata.description,
              tier: event.metadata.tier,
              url: event.metadata.url,
              image: event.metadata.image,
              invitedUserAddress: event.metadata.invitedUserAddress,
              invitedUsers: event.metadata.invitedUsers,
              rarity: event.metadata.rarity
            }
          }
        ]
      case Events.SubType.Community.DELETED:
      case Events.SubType.Community.RENAMED:
        return event.metadata.memberAddresses.map((memberAddress: EthAddress) => {
          return {
            type:
              event.subType === Events.SubType.Community.DELETED
                ? NotificationType.COMMUNITY_DELETED
                : NotificationType.COMMUNITY_RENAMED,
            address: memberAddress,
            eventKey: event.key,
            timestamp: event.timestamp,
            optOutScope: {
              scope: NotificationScope.Community,
              scopeId: event.metadata.id
            },
            metadata: {
              ...event.metadata,
              communityId: event.metadata.id,
              communityName: event.subType === Events.SubType.Community.DELETED ? event.metadata.name : undefined,
              name: undefined, // renamed to communityName
              id: undefined, // renamed to communityId
              memberAddresses: undefined // whole member list is not needed
            }
          }
        })
      case Events.SubType.Community.MEMBER_BANNED:
      case Events.SubType.Community.MEMBER_REMOVED:
        return [
          {
            type:
              event.subType === Events.SubType.Community.MEMBER_BANNED
                ? NotificationType.COMMUNITY_MEMBER_BANNED
                : NotificationType.COMMUNITY_MEMBER_REMOVED,
            address: event.metadata.memberAddress,
            eventKey: event.key,
            timestamp: event.timestamp,
            optOutScope: {
              scope: NotificationScope.Community,
              scopeId: event.metadata.id
            },
            metadata: {
              ...event.metadata,
              communityId: event.metadata.id,
              communityName: event.metadata.name,
              id: undefined, // renamed to communityId
              name: undefined, // renamed to communityName
              memberAddress: undefined // already assigned to address
            }
          }
        ]
      case Events.SubType.Community.DELETED_CONTENT_VIOLATION:
        const { id, name, ownerAddress, thumbnailUrl } = event.metadata
        return [
          {
            type: NotificationType.COMMUNITY_DELETED_CONTENT_VIOLATION,
            address: ownerAddress,
            eventKey: event.key,
            timestamp: event.timestamp,
            optOutScope: {
              scope: NotificationScope.Community,
              scopeId: id
            },
            metadata: {
              communityId: id,
              communityName: name,
              thumbnailUrl: thumbnailUrl
            }
          }
        ]
      case Events.SubType.Community.REQUEST_TO_JOIN_ACCEPTED:
        return [
          {
            type: NotificationType.COMMUNITY_REQUEST_TO_JOIN_ACCEPTED,
            address: event.metadata.memberAddress,
            eventKey: event.key,
            timestamp: event.timestamp,
            optOutScope: {
              scope: NotificationScope.Community,
              scopeId: event.metadata.communityId
            },
            metadata: {
              ...event.metadata
            }
          }
        ]
      case Events.SubType.Community.REQUEST_TO_JOIN_RECEIVED:
        return event.metadata.addressesToNotify.map((address: EthAddress) => {
          return {
            type: NotificationType.COMMUNITY_REQUEST_TO_JOIN_RECEIVED,
            address: address,
            eventKey: event.key,
            timestamp: event.timestamp,
            optOutScope: {
              scope: NotificationScope.Community,
              scopeId: event.metadata.communityId
            },
            metadata: {
              ...event.metadata,
              addressesToNotify: undefined
            }
          }
        })
      case Events.SubType.Community.INVITE_RECEIVED:
        return [
          {
            type: NotificationType.COMMUNITY_INVITE_RECEIVED,
            address: event.metadata.memberAddress,
            eventKey: event.key,
            timestamp: event.timestamp,
            optOutScope: {
              scope: NotificationScope.Community,
              scopeId: event.metadata.communityId
            },
            metadata: {
              ...event.metadata,
              memberAddress: undefined
            }
          }
        ]
      case Events.SubType.Community.POST_ADDED:
        return event.metadata.addressesToNotify.map((address: EthAddress) => ({
          type: NotificationType.COMMUNITY_POST_ADDED,
          address,
          eventKey: event.key,
          timestamp: event.timestamp,
          optOutScope: {
            scope: NotificationScope.Community,
            scopeId: event.metadata.communityId
          },
          metadata: {
            communityId: event.metadata.communityId,
            communityName: event.metadata.communityName,
            thumbnailUrl: event.metadata.thumbnailUrl,
            postId: event.metadata.postId,
            authorAddress: event.metadata.authorAddress
          }
        }))
      case Events.SubType.Community.OWNERSHIP_TRANSFERRED:
        return [
          {
            type: NotificationType.COMMUNITY_OWNERSHIP_TRANSFERRED,
            address: event.metadata.newOwnerAddress,
            eventKey: event.key,
            timestamp: event.timestamp,
            optOutScope: {
              scope: NotificationScope.Community,
              scopeId: event.metadata.communityId
            },
            metadata: {
              communityId: event.metadata.communityId,
              communityName: event.metadata.communityName,
              thumbnailUrl: event.metadata.thumbnailUrl,
              oldOwnerAddress: event.metadata.oldOwnerAddress
            }
          }
        ]
      case Events.SubType.Community.VOICE_CHAT_STARTED:
        return event.metadata.addressesToNotify.map((address: EthAddress) => ({
          type: NotificationType.COMMUNITY_VOICE_CHAT_STARTED,
          address,
          eventKey: event.key,
          timestamp: event.timestamp,
          optOutScope: {
            scope: NotificationScope.Community,
            scopeId: event.metadata.communityId
          },
          metadata: {
            communityId: event.metadata.communityId,
            communityName: event.metadata.communityName,
            thumbnailUrl: event.metadata.thumbnailUrl
          }
        }))
      case Events.SubType.Comms.USER_BANNED_FROM_SCENE:
      case Events.SubType.Comms.USER_UNBANNED_FROM_SCENE:
        return [
          {
            type: commsNotificationTypeByEventSubtype(event.subType),
            address: event.metadata.userAddress,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              placeTitle: event.metadata.placeTitle
            }
          }
        ]
      case Events.SubType.Moderation.USER_BAN_CREATED:
        return [
          {
            type: moderationNotificationTypeByEventSubtype(event.subType),
            address: event.metadata.bannedAddress,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              reason: event.metadata.reason,
              bannedAt: event.metadata.bannedAt,
              expiresAt: event.metadata.expiresAt,
              customMessage: event.metadata.customMessage
            }
          }
        ]
      case Events.SubType.Moderation.USER_WARNING_CREATED:
        return [
          {
            type: moderationNotificationTypeByEventSubtype(event.subType),
            address: event.metadata.warnedAddress,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              reason: event.metadata.reason,
              warnedAt: event.metadata.warnedAt
            }
          }
        ]
      case Events.SubType.Moderation.USER_BAN_LIFTED:
        return [
          {
            type: moderationNotificationTypeByEventSubtype(event.subType),
            address: event.metadata.bannedAddress,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              liftedAt: event.metadata.liftedAt
            }
          }
        ]
      case Events.SubType.Event.EVENT_CREATED:
        return [
          {
            type: NotificationType.EVENT_CREATED,
            address: event.metadata.attendee,
            eventKey: event.key,
            timestamp: event.timestamp,
            optOutScope: {
              scope: NotificationScope.Community,
              scopeId: event.metadata.communityId
            },
            metadata: {
              title: event.metadata.title,
              description: event.metadata.description,
              name: event.metadata.name,
              image: event.metadata.image,
              communityId: event.metadata.communityId,
              communityName: event.metadata.communityName,
              communityThumbnail: event.metadata.communityThumbnail
            }
          }
        ]
      case Events.SubType.Event.EVENT_STARTED:
        return [
          {
            type: NotificationType.EVENTS_STARTED,
            address: event.metadata.attendee,
            eventKey: event.key,
            timestamp: event.timestamp,
            optOutScope: {
              scope: NotificationScope.Community,
              scopeId: event.metadata.communityId
            },
            metadata: {
              title: event.metadata.title,
              description: event.metadata.description,
              name: event.metadata.name,
              image: event.metadata.image,
              link: event.metadata.link,
              communityThumbnail: event.metadata.communityThumbnail
            }
          }
        ]
      case Events.SubType.Event.EVENT_STARTS_SOON:
        return [
          {
            type: NotificationType.EVENTS_STARTS_SOON,
            address: event.metadata.attendee,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              title: event.metadata.title,
              description: event.metadata.description,
              name: event.metadata.name,
              image: event.metadata.image,
              link: event.metadata.link,
              startsAt: event.metadata.startsAt,
              endsAt: event.metadata.endsAt
            }
          }
        ]
      case Events.SubType.Event.EVENT_APPROVED: {
        return [
          {
            type: NotificationType.EVENT_APPROVED,
            address: event.metadata.host,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              title: event.metadata.title,
              description: event.metadata.description,
              image: event.metadata.image,
              link: event.metadata.link,
              myHangouts: `${DECENTRALAND_URL}/whats-on?tab=my`
            }
          }
        ]
      }
      case Events.SubType.Event.EVENT_REJECTED: {
        return [
          {
            type: NotificationType.EVENT_REJECTED,
            address: event.metadata.host,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              title: event.metadata.title,
              description: event.metadata.description,
              image: event.metadata.image,
              reason: event.metadata.reason,
              myHangouts: `${DECENTRALAND_URL}/whats-on?tab=my`
            }
          }
        ]
      }
      case Events.SubType.Event.EVENT_DELETED: {
        return [
          {
            type: NotificationType.EVENT_DELETED,
            address: event.metadata.host,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              title: event.metadata.title,
              description: event.metadata.description,
              image: event.metadata.image,
              reason: event.metadata.reason,
              myHangouts: `${DECENTRALAND_URL}/whats-on?tab=my`
            }
          }
        ]
      }
      case Events.SubType.Governance.PROPOSAL_ENACTED:
        return [
          {
            type: NotificationType.GOVERNANCE_PROPOSAL_ENACTED,
            address: event.metadata.address,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              proposalId: event.metadata.proposalId,
              proposalTitle: event.metadata.proposalTitle,
              title: event.metadata.title,
              description: event.metadata.description,
              link: event.metadata.link
            }
          }
        ]
      case Events.SubType.Governance.COAUTHOR_REQUESTED:
        return [
          {
            type: NotificationType.GOVERNANCE_COAUTHOR_REQUESTED,
            address: event.metadata.address,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              proposalId: event.metadata.proposalId,
              proposalTitle: event.metadata.proposalTitle,
              title: event.metadata.title,
              description: event.metadata.description,
              link: event.metadata.link
            }
          }
        ]
      case Events.SubType.Governance.PITCH_PASSED:
        return [
          {
            type: NotificationType.GOVERNANCE_PITCH_PASSED,
            address: event.metadata.address,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              proposalId: event.metadata.proposalId,
              proposalTitle: event.metadata.proposalTitle,
              title: event.metadata.title,
              description: event.metadata.description,
              link: event.metadata.link
            }
          }
        ]
      case Events.SubType.Governance.TENDER_PASSED:
        return [
          {
            type: NotificationType.GOVERNANCE_TENDER_PASSED,
            address: event.metadata.address,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              proposalId: event.metadata.proposalId,
              proposalTitle: event.metadata.proposalTitle,
              title: event.metadata.title,
              description: event.metadata.description,
              link: event.metadata.link
            }
          }
        ]
      case Events.SubType.Governance.AUTHORED_PROPOSAL_FINISHED:
        return [
          {
            type: NotificationType.GOVERNANCE_AUTHORED_PROPOSAL_FINISHED,
            address: event.metadata.address,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              proposalId: event.metadata.proposalId,
              proposalTitle: event.metadata.proposalTitle,
              title: event.metadata.title,
              description: event.metadata.description,
              link: event.metadata.link
            }
          }
        ]
      case Events.SubType.Governance.VOTING_ENDED_VOTER:
        return [
          {
            type: NotificationType.GOVERNANCE_VOTING_ENDED_VOTER,
            address: event.metadata.address,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              proposalId: event.metadata.proposalId,
              proposalTitle: event.metadata.proposalTitle,
              title: event.metadata.title,
              description: event.metadata.description,
              link: event.metadata.link
            }
          }
        ]
      case Events.SubType.Governance.NEW_COMMENT_ON_PROPOSAL:
        return [
          {
            type: NotificationType.GOVERNANCE_NEW_COMMENT_ON_PROPOSAL,
            address: event.metadata.address,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              proposalId: event.metadata.proposalId,
              proposalTitle: event.metadata.proposalTitle,
              title: event.metadata.title,
              description: event.metadata.description,
              link: event.metadata.link
            }
          }
        ]
      case Events.SubType.Governance.NEW_COMMENT_ON_PROJECT_UPDATED:
        return [
          {
            type: NotificationType.GOVERNANCE_NEW_COMMENT_ON_PROJECT_UPDATE,
            address: event.metadata.address,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              proposalId: event.metadata.proposalId,
              proposalTitle: event.metadata.proposalTitle,
              title: event.metadata.title,
              description: event.metadata.description,
              link: event.metadata.link
            }
          }
        ]
      case Events.SubType.Governance.WHALE_VOTE:
        return [
          {
            type: NotificationType.GOVERNANCE_WHALE_VOTE,
            address: event.metadata.address,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              proposalId: event.metadata.proposalId,
              proposalTitle: event.metadata.proposalTitle,
              title: event.metadata.title,
              description: event.metadata.description,
              link: event.metadata.link
            }
          }
        ]
      case Events.SubType.Governance.VOTED_ON_BEHALF:
        return [
          {
            type: NotificationType.GOVERNANCE_VOTED_ON_BEHALF,
            address: event.metadata.address,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              proposalId: event.metadata.proposalId,
              proposalTitle: event.metadata.proposalTitle,
              title: event.metadata.title,
              description: event.metadata.description,
              link: event.metadata.link
            }
          }
        ]
      case Events.SubType.Governance.CLIFF_ENDED:
        return [
          {
            type: NotificationType.GOVERNANCE_CLIFF_ENDED,
            address: event.metadata.address,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              proposalId: event.metadata.proposalId,
              proposalTitle: event.metadata.proposalTitle,
              title: event.metadata.title,
              description: event.metadata.description,
              link: event.metadata.link
            }
          }
        ]
      case Events.SubType.Worlds.WORLDS_PERMISSION_GRANTED:
        return [
          {
            type: NotificationType.WORLDS_PERMISSION_GRANTED,
            address: event.metadata.address,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              title: event.metadata.title,
              description: event.metadata.description,
              world: event.metadata.world,
              permissions: event.metadata.permissions,
              url: event.metadata.url
            }
          }
        ]
      case Events.SubType.Worlds.WORLDS_PERMISSION_REVOKED:
        return [
          {
            type: NotificationType.WORLDS_PERMISSION_REVOKED,
            address: event.metadata.address,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              title: event.metadata.title,
              description: event.metadata.description,
              world: event.metadata.world,
              permissions: event.metadata.permissions,
              url: event.metadata.url
            }
          }
        ]
      case Events.SubType.Worlds.WORLDS_ACCESS_RESTORED:
        return [
          {
            type: NotificationType.WORLDS_ACCESS_RESTORED,
            address: event.metadata.attendee,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              title: event.metadata.title,
              description: event.metadata.description,
              url: event.metadata.url
            }
          }
        ]
      case Events.SubType.Worlds.WORLDS_ACCESS_RESTRICTED:
        return [
          {
            type: NotificationType.WORLDS_ACCESS_RESTRICTED,
            address: event.metadata.address,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              title: event.metadata.title,
              description: event.metadata.description,
              when: event.metadata.when
            }
          }
        ]
      case Events.SubType.Worlds.WORLDS_MISSING_RESOURCES:
        return [
          {
            type: NotificationType.WORLDS_MISSING_RESOURCES,
            address: event.metadata.address,
            eventKey: event.key,
            timestamp: event.timestamp,
            metadata: {
              title: event.metadata.title,
              description: event.metadata.description,
              url: event.metadata.url,
              when: event.metadata.when
            }
          }
        ]
      default:
        return []
    }
  }

  return { parseToNotifications }
}
