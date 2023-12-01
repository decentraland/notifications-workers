import { AppComponents, INotificationGenerator, NotificationRecord } from '../../types'
import { formatMana } from '../../logic/utils'

export const PAGE_SIZE = 1000

const BIDS_QUERY = `
    query Bids($since: BigInt!, $paginationId: ID) {
      bids(
        where: {updatedAt_gte: $since, id_gt: $paginationId, status: sold}
        orderBy: id
        orderDirection: desc
        first: ${PAGE_SIZE}
      ) {
        id
        bidder
        seller
        nft {
          id
          category
          image
          metadata {
            id
            wearable {
              id
              name
              description
              rarity
            }
            emote {
              id
              name
              description
              rarity
            }
          }
          contractAddress
          tokenId
        }
        updatedAt
        price
        blockchainId
      }
    }
`

type BidsResponse = {
  bids: {
    id: string
    type: string
    bidder: string
    seller: string
    nft: {
      id: string
      category: 'wearable' | 'emote'
      image: string
      metadata: {
        id: string
        wearable?: {
          id: string
          name: string
          description: string
          rarity: string
        }
        emote?: {
          id: string
          name: string
          description: string
          rarity: string
        }
      }
      contractAddress: string
      tokenId: string
    }
    updatedAt: number
    price: string
    blockchainId: string
  }[]
}

const notificationType = 'bid_accepted'

export async function bidAcceptedProducer(
  components: Pick<AppComponents, 'config' | 'l2CollectionsSubGraph'>
): Promise<INotificationGenerator> {
  const { config, l2CollectionsSubGraph } = components

  const marketplaceBaseUrl = await config.requireString('MARKETPLACE_BASE_URL')

  async function run(since: Date) {
    const now = new Date()
    const produced: NotificationRecord[] = []
    const sinceDate: number = Math.floor(since.getTime() / 1000)

    let result: BidsResponse
    let paginationId = ''
    do {
      result = await l2CollectionsSubGraph.query<BidsResponse>(BIDS_QUERY, {
        since: sinceDate,
        paginationId
      })

      if (result.bids.length === 0) {
        break
      }

      for (const bid of result.bids) {
        const notificationRecord = {
          type: notificationType,
          address: bid.bidder,
          eventKey: bid.blockchainId,
          metadata: {
            image: bid.nft.image,
            seller: bid.seller,
            category: bid.nft.category,
            rarity: bid.nft.metadata[bid.nft.category]?.rarity,
            link: `${marketplaceBaseUrl}/contracts/${bid.nft.contractAddress}/tokens/${bid.nft.tokenId}`,
            nftName: bid.nft.metadata[bid.nft.category]?.name,
            title: 'Bid Accepted',
            description: `
            Your bid for ${formatMana(bid.price)} MANA for this ${
              bid.nft.metadata[bid.nft.category]?.name
            } was accepted.`,
            network: 'polygon'
          },
          timestamp: bid.updatedAt
        }
        produced.push(notificationRecord)

        paginationId = bid.id
      }
    } while (result.bids.length === PAGE_SIZE)

    return {
      notificationType: notificationType,
      records: produced,
      lastRun: now
    }
  }

  return {
    notificationType,
    run
  }
}
