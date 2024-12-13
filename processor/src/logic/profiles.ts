import { createLambdasClient } from 'dcl-catalyst-client'
import { AppComponents, ProfilesComponent } from '../types'
import { Profile } from 'dcl-catalyst-client/dist/client/specs/lambdas-client'

const CATALYST_URL = 'https://peer.decentraland.org'

export function createProfilesComponent({ fetch }: Pick<AppComponents, 'fetch'>): ProfilesComponent {
  const lambdasClient = createLambdasClient({ url: CATALYST_URL, fetcher: fetch })

  async function getByAddress(address: string): Promise<Profile | null> {
    const profiles = await lambdasClient.getAvatarsDetailsByPost({ ids: [address] })
    return profiles.length > 0 ? profiles[0] : null
  }

  return {
    getByAddress
  }
}
