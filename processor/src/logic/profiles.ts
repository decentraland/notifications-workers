import { createCatalystClient } from 'dcl-catalyst-client'
import { createFetchComponent } from '@well-known-components/fetch-component'

const CATALYST_URL = 'https://peer.decentraland.org'

export async function profileFromAdress(address: string) {
  const fetcher = createFetchComponent()
  const client = createCatalystClient({ url: CATALYST_URL, fetcher })
  const lambdasClient = await client.getLambdasClient()
  const profiles = await lambdasClient.getAvatarsDetailsByPost({ ids: [address] })

  return profiles.length > 0 ? profiles[0] : null
}
