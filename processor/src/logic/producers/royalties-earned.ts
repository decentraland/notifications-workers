import { AppComponents, INotificationProducer, NotificationRecord } from '../../types'
import { formatMana } from '../utils'

const ROYALTIES_EARNED_QUERY = `
    query Sales($since: BigInt!) {
      sales(
        where: {timestamp_gte: $since, royaltiesCut_not: "0"}
        orderBy: timestamp
        orderDirection: asc
      ) {
        id
        type
        buyer
        seller
        royaltiesCut
        royaltiesCollector
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
        searchContractAddress
        searchCategory
        price
        txHash
        timestamp
      }
    }
  `

export const PAGE_SIZE = 100

type SalesResponse = {
  sales: {
    id: string
    type: string
    buyer: string
    seller: string
    royaltiesCut: string
    royaltiesCollector: string
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
    timestamp: number
  }[]
}

const notificationType = 'royalties_earned'

export async function royaltiesEarnedProducer(
  components: Pick<AppComponents, 'config' | 'l2CollectionsSubGraph'>
): Promise<INotificationProducer> {
  const { config, l2CollectionsSubGraph } = components

  const marketplaceBaseUrl = await config.requireString('MARKETPLACE_BASE_URL')

  async function run(since: Date) {
    const now = new Date()
    const produced: NotificationRecord[] = []
    let sinceDate: number = Math.floor(since.getTime() / 1000)

    let result: SalesResponse
    do {
      result = await l2CollectionsSubGraph.query<SalesResponse>(ROYALTIES_EARNED_QUERY, {
        since: sinceDate
      })

      if (result.sales.length === 0) {
        break
      }

      for (const sale of result.sales) {
        const notificationRecord = {
          type: notificationType,
          address: sale.royaltiesCollector,
          metadata: {
            image: sale.nft.image,
            category: sale.nft.category,
            rarity: sale.nft.metadata[sale.nft.category]?.rarity,
            link: `${marketplaceBaseUrl}/contracts/${sale.nft.contractAddress}/tokens/${sale.nft.tokenId}`,
            nftName: sale.nft.metadata[sale.nft.category]?.name,
            title: 'Royalties Earned',
            description: `You earned ${formatMana(sale.royaltiesCut)} MANA for this ${
              sale.nft.metadata[sale.nft.category]?.name
            }`,
            royaltiesCut: sale.royaltiesCut,
            royaltiesCollector: sale.royaltiesCollector,
            network: 'polygon'
          },
          timestamp: sale.timestamp
        }
        produced.push(notificationRecord)
      }

      const idFromLastElement = produced[produced.length - 1].timestamp
      if (!idFromLastElement) {
        throw new Error('Error getting id from last entity from previous page')
      }

      sinceDate = idFromLastElement
    } while (result.sales.length === PAGE_SIZE)

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
