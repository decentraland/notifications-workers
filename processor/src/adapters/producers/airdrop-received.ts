import { AppComponents, INotificationGenerator, NotificationRecord } from '../../types'

export const PAGE_SIZE = 1000

const AIRDROPS_QUERY = `
    query Mints($since: BigInt!, $paginationId: ID) {
      mints(
        where: {timestamp_gte: $since, searchIsStoreMinter: false, id_gt: $paginationId}
        orderBy: id
        orderDirection: asc
        first: ${PAGE_SIZE}
      ) {
        id
        minter
        beneficiary
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
        timestamp
      }
    }
  `

type MintsResponse = {
  mints: {
    id: string
    minter: string
    beneficiary: string
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

const notificationType = 'airdrop_received'

export async function airdropReceivedProducer(
  components: Pick<AppComponents, 'config' | 'l2CollectionsSubGraph'>
): Promise<INotificationGenerator> {
  const { config, l2CollectionsSubGraph } = components

  const marketplaceBaseUrl = await config.requireString('MARKETPLACE_BASE_URL')

  async function run(since: number) {
    const now = Date.now()
    const produced: NotificationRecord[] = []

    let result: MintsResponse
    let paginationId = ''
    do {
      result = await l2CollectionsSubGraph.query<MintsResponse>(AIRDROPS_QUERY, {
        since: Math.floor(since / 1000),
        paginationId
      })

      if (result.mints.length === 0) {
        break
      }

      for (const mint of result.mints) {
        if (mint.minter === mint.beneficiary) {
          continue
        }
        console.log('mint', mint.minter, mint.beneficiary)
        const notificationRecord = {
          type: notificationType,
          address: mint.beneficiary,
          eventKey: mint.id,
          metadata: {
            image: mint.nft.image,
            category: mint.nft.category,
            rarity: mint.nft.metadata[mint.nft.category]?.rarity,
            link: `${marketplaceBaseUrl}/contracts/${mint.nft.contractAddress}/tokens/${mint.nft.tokenId}`,
            nftName: mint.nft.metadata[mint.nft.category]?.name,
            title: 'New Item Airdropped',
            description: `This ${mint.nft.metadata[mint.nft.category]?.name} was gifted to you by ${mint.minter}.`,
            network: 'polygon'
          },
          timestamp: mint.timestamp * 1000
        }
        produced.push(notificationRecord)

        paginationId = mint.id
      }
    } while (result.mints.length === PAGE_SIZE)

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
