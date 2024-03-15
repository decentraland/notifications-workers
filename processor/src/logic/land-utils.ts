import { ISubgraphComponent } from '@well-known-components/thegraph-component'
import { NotificationRecord } from '../types'

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

export async function findCoordinatesForLandTokenId(
  landManagerSubGraph: ISubgraphComponent,
  chunk: NotificationRecord[]
) {
  const landResult = await landManagerSubGraph.query<LandResponse>(LAND_QUERY, {
    tokenIds: chunk.map((r) => r.metadata.tokenId)
  })

  return landResult.parcels.reduce(
    (acc, land) => {
      acc[land.tokenId] = `${land.x},${land.y}`
      return acc
    },
    {} as Record<string, string>
  )
}
