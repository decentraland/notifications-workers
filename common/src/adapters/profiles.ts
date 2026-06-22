import { createLambdasClient } from 'dcl-catalyst-client'
import { IConfigComponent, ILoggerComponent } from '@well-known-components/interfaces'
import { IFetchComponent } from '@dcl/core-commons'
import { Profile } from 'dcl-catalyst-client/dist/client/specs/lambdas-client'

type AppComponents = {
  fetch: IFetchComponent
  config: IConfigComponent
  logs: ILoggerComponent
}

export type IProfilesComponent = {
  getByAddress(address: string): Promise<Profile | null>
}

export async function createProfilesComponent({ fetch, config, logs }: AppComponents): Promise<IProfilesComponent> {
  let catalystLambdasUrl = await config.requireString('CATALYST_LAMBDAS_URL')

  if (!catalystLambdasUrl.endsWith('/lambdas')) {
    catalystLambdasUrl += '/lambdas'
  }

  const lambdasClient = createLambdasClient({
    url: catalystLambdasUrl,
    // dcl-catalyst-client@21 types `fetcher` against the node-fetch WKC IFetchComponent;
    // the native fetch is runtime-compatible (only `.fetch(url, opts)` is used).
    fetcher: fetch as unknown as Parameters<typeof createLambdasClient>[0]['fetcher']
  })
  const logger = logs.getLogger('create-profiles-component')

  async function getByAddress(address: string): Promise<Profile | null> {
    try {
      const profiles = await lambdasClient.getAvatarsDetailsByPost({ ids: [address] })
      return profiles.length > 0 ? profiles[0] : null
    } catch (error) {
      logger.warn(`Error getting profile ${error}`)
    }

    return null
  }
  return {
    getByAddress
  }
}
