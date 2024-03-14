import { AppComponents, INotificationGenerator, NotificationRecord } from '../../types'
import { chunks } from '../../logic/utils'

export const PAGE_SIZE = 1000

const RENTALS_STARTED_QUERY = `
    query StartedRentals($since: BigInt!, $upTo: BigInt!, $paginationId: ID) {
      rentals(
        where: {id_gt: $paginationId, startedAt_gte: $since, startedAt_lt: $upTo}
        orderBy: id
        orderDirection: desc
        first: ${PAGE_SIZE}
      ) {
        id
        lessor
        tenant
        operator
        startedAt
        endsAt
        tokenId
      }
    }
`

type RentalsResponse = {
  rentals: {
    id: string
    lessor: string
    tenant: string
    operator: string
    startedAt: string
    endsAt: string
    tokenId: string
  }[]
}

const LAND_QUERY = `
    query Lands($tokenIds: [String!]) {
      parcels(where: {tokenId_in: $tokenIds}) {
        x
        y
        tokenId
      }
    }
`

type LandResponse = {
  parcels: {
    x: number
    y: number
    tokenId: string
  }[]
}

const notificationType = 'rental_started'

export async function rentalStartedProducer(
  components: Pick<AppComponents, 'config' | 'landManagerSubGraph' | 'rentalsSubGraph'>
): Promise<INotificationGenerator> {
  const { config, landManagerSubGraph, rentalsSubGraph } = components

  const marketplaceBaseUrl = await config.requireString('MARKETPLACE_BASE_URL')

  async function run(since: number) {
    const now = Date.now()
    const produced: NotificationRecord[] = []

    let result: RentalsResponse
    let paginationId = ''
    do {
      result = await rentalsSubGraph.query<RentalsResponse>(RENTALS_STARTED_QUERY, {
        since: Math.floor(since / 1000),
        upTo: Math.floor(now / 1000),
        paginationId
      })

      if (result.rentals.length === 0) {
        break
      }

      for (const rental of result.rentals) {
        const notificationRecord = {
          type: notificationType,
          address: rental.lessor,
          eventKey: rental.id,
          metadata: {
            lessor: rental.lessor,
            tenant: rental.tenant,
            operator: rental.operator,
            startedAt: rental.startedAt,
            endedAt: rental.endsAt,
            tokenId: rental.tokenId,
            link: `${marketplaceBaseUrl}/contracts/${rental.id}`,
            land: rental.tokenId,
            title: 'LAND Rented',
            description: `Your @LAND was rented by @account.`
          },
          timestamp: parseInt(rental.startedAt) * 1000
        }
        produced.push(notificationRecord)

        paginationId = rental.id
      }
    } while (result.rentals.length === PAGE_SIZE)

    for (const chunk of chunks(produced, 1000)) {
      const landResult = await landManagerSubGraph.query<LandResponse>(LAND_QUERY, {
        tokenIds: chunk.map((r) => r.metadata.tokenId)
      })

      const landsByTokenId = landResult.parcels.reduce(
        (acc, land) => {
          acc[land.tokenId] = `${land.x},${land.y}`
          return acc
        },
        {} as Record<string, string>
      )
      for (const record of chunk) {
        record.metadata.land = landsByTokenId[record.metadata.tokenId]
        record.metadata.description = `Your land ${landsByTokenId[record.metadata.tokenId]} was rented by ${record.metadata.tenant}.`
      }
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
