import { AppComponents, INotificationProducer, NotificationRecord } from '../../types'

type SalesResponse = {
  sales: {
    id: string
    type: string
    buyer: string
    seller: string
    nft: {
      id: string
      category: string
      image: string
      name: string
      searchWearableRarity: string
      contractAddress: string
      tokenId: string
    }
    timestamp: number
  }[]
}

const notificationType = 'item_sold'

export function itemSoldProducer(components: Pick<AppComponents, 'marketplaceSubGraph'>): INotificationProducer {
  const { marketplaceSubGraph } = components

  async function run(since: Date) {
    const now = new Date()
    const query = `
      query Sales($since: BigInt!) {
        sales(
          where: {timestamp_gte: $since, type: order}
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          type
          buyer
          seller
          nft {
            id
            category
            image
            name
            searchWearableRarity
            contractAddress
            tokenId
          }
          timestamp
        }
      }
    `
    const updates = await marketplaceSubGraph.query<SalesResponse>(query, {
      since: Math.floor(since.getTime() / 1000)
    })

    const produced: NotificationRecord[] = []
    for (const sale of updates.sales) {
      const notificationRecord = {
        type: notificationType,
        address: sale.seller,
        metadata: {
          image: sale.nft.image,
          seller: sale.seller,
          category: sale.nft.category,
          rarity: sale.nft.searchWearableRarity,
          link: `https://market.decentraland.org/contracts/${sale.nft.contractAddress}/tokens/${sale.nft.tokenId}`,
          timestamp: sale.timestamp,
          nftName: sale.nft.name,
          title: 'Item Sold',
          description: `You just sold this ${sale.nft.name}`
        }
      }
      produced.push(notificationRecord)
    }

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
