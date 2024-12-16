import { createLambdasClient } from 'dcl-catalyst-client'
import { IFetchComponent } from '@well-known-components/interfaces'
import { Profile } from 'dcl-catalyst-client/dist/client/specs/lambdas-client'

const CATALYST_LAMBDAS_URL = 'https://peer.decentraland.org/lambdas'

type AppComponents = {
  fetch: IFetchComponent
}

export type ProfilesComponent = {
  getByAddress(address: string): Promise<Profile | null>
}

export function createProfilesComponent({ fetch }: Pick<AppComponents, 'fetch'>): ProfilesComponent {
  const lambdasClient = createLambdasClient({ url: CATALYST_LAMBDAS_URL, fetcher: fetch })

  async function getByAddress(address: string): Promise<Profile | null> {
    const profiles = await lambdasClient.getAvatarsDetailsByPost({ ids: [address] })
    return profiles.length > 0 ? profiles[0] : null
  }

  return {
    getByAddress
  }
}
