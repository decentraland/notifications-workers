import { NotificationRecord } from '@notifications/common'
import { Event, Events, NotificationType } from '@dcl/schemas'
import { IEventParser } from '../types'

export function createEventParser(): IEventParser {
  function parseToNotification(event: Event): NotificationRecord | undefined {
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
      case Events.SubType.Blockchain.BID_RECEIVED:
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
      default:
        return undefined
    }
  }

  return { parseToNotification }
}
