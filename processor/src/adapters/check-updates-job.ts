import { AppComponents, IRunnable } from '../types'
import { CronJob } from 'cron'

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

export function createCheckUpdatesJob(
  components: Pick<AppComponents, 'logs' | 'marketplaceSubGraph' | 'db'>
): IRunnable<void> {
  const { logs, marketplaceSubGraph, db } = components
  const logger = logs.getLogger('check-updates-job')

  let startDate: Date | undefined = undefined

  async function run() {
    if (!startDate) {
      throw new Error('startDate is undefined')
    }
    const now = new Date()
    logger.info('Checking for updates since ' + startDate.toISOString())
    const query = `
      query Sales($since: BigInt!) {
        sales(
          where: {timestamp_gte: $since, type: order, searchCategory: "wearable"}
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
      since: Math.floor(startDate.getTime() / 1000)
    })
    for (const sale of updates.sales) {
      const notificationRecord = {
        type: 'item_sold',
        address: sale.seller,
        metadata: {
          image: sale.nft.image,
          seller: sale.seller,
          rarity: sale.nft.searchWearableRarity,
          typeIcon: 'https://cdn-icons.decentraland.org/item-sold.png',
          link: `https://market.decentraland.org/contracts/${sale.nft.contractAddress}/tokens/${sale.nft.tokenId}`,
          timestamp: sale.timestamp,
          nftName: sale.nft.name
        },
        i18n: {
          en: {
            title: 'Item Sold',
            description: `You just sold this ${sale.nft.name}`
          },
          es: { title: 'Ítem vendido', description: `Acabas de vender este ${sale.nft.name}` },
          zh: { title: '已售商品', description: `您刚刚卖掉了这个 ${sale.nft.name}` }
        }
      }
      console.log('notificationRecord', notificationRecord)
      await db.insertNotification(notificationRecord)
    }

    await db.updateLastUpdateForNotificationType('item_sold', now)
    startDate = now
  }

  async function start(): Promise<void> {
    logger.info('Scheduling check updates job')

    startDate = new Date(await db.fetchLastUpdateForNotificationType('item_sold'))

    const job = new CronJob(
      '0/30 * * * * *',
      async function () {
        logger.info('Running job: ' + new Date().toISOString())
        await run()
        logger.info('Done running job: ' + new Date().toISOString())
      },
      null,
      false,
      'UCT'
    )
    job.start()
  }

  return {
    run,
    start
  }
}
