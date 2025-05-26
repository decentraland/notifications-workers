import { IBaseComponent, IHttpServerComponent } from '@well-known-components/interfaces'
import { AppComponents, Feature } from '../types'
import { EthAddress } from '@dcl/schemas'

export type IChallengerAdapter = IBaseComponent & {
  verifyChallengeIfEnabled: (
    token: string | undefined,
    metadata: { userAddress: EthAddress; request: IHttpServerComponent.IRequest }
  ) => Promise<boolean>
}

export async function createChallengerAdapter(
  components: Pick<AppComponents, 'logs' | 'config' | 'fetch' | 'featureFlagsAdapter'>
) {
  const { logs, config, fetch, featureFlagsAdapter } = components

  const CLOUDFLARE_CHALLENGE_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
  const CLOUDFLARE_SECRET = await config.requireString('CLOUDFLARE_SECRET')
  const ORIGIN_EXPECTED_FOR_CLOUDFLARE_CHALLENGE = await config.requireString(
    'ORIGIN_EXPECTED_FOR_CLOUDFLARE_CHALLENGE'
  )
  const logger = logs.getLogger('challenger-adapter')

  /**
   * Checks if the challenge is enabled and if the token is correct
   * @param token - The token to verify
   * @param userAddress - The address of the user
   * @returns True if the challenge is disabled or the token is correct
   */
  async function verifyChallengeIfEnabled(
    token: string | undefined,
    metadata: { userAddress: EthAddress; request: IHttpServerComponent.IRequest }
  ) {
    const callingOrigin = metadata.request.headers.get('origin')
    const isChallengeEnabled = featureFlagsAdapter.isEnabled(Feature.TURNSTILE_VERIFICATION)
    const isOriginExpected = callingOrigin?.toLowerCase() === ORIGIN_EXPECTED_FOR_CLOUDFLARE_CHALLENGE.toLowerCase()

    logger.debug('CloudFlare challenge is enabled, verifying token', {
      userAddress: metadata.userAddress,
      token: token ?? 'missing',
      isChallengeEnabled: isChallengeEnabled ? 'enabled' : 'disabled',
      callingOrigin: callingOrigin ?? 'missing',
      isOriginExpected: isOriginExpected ? 'expected' : 'not expected'
    })

    if (!isChallengeEnabled || !isOriginExpected) {
      return true
    }

    if (!token) {
      return false
    }

    const response = await fetch.fetch(CLOUDFLARE_CHALLENGE_URL, {
      method: 'POST',
      body: JSON.stringify({
        secret: CLOUDFLARE_SECRET,
        response: token
      })
    })

    const data = await response.json()

    return data.success
  }

  return {
    verifyChallengeIfEnabled
  }
}
