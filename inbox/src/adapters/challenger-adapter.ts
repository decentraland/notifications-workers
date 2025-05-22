import { IBaseComponent } from '@well-known-components/interfaces'
import { AppComponents, Feature } from '../types'
import { EthAddress } from '@dcl/schemas'

export type IChallengerAdapter = IBaseComponent & {
  verifyChallengeIfEnabled: (token: string | undefined, userAddress: EthAddress) => Promise<boolean>
}

export async function createChallengerAdapter(
  components: Pick<AppComponents, 'logs' | 'config' | 'fetch' | 'featureFlagsAdapter'>
) {
  const { logs, config, fetch, featureFlagsAdapter } = components

  const CLOUDFLARE_CHALLENGE_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
  const CLOUDFLARE_SECRET = await config.requireString('CLOUDFLARE_SECRET')
  const logger = logs.getLogger('challenger-adapter')

  /**
   * Checks if the challenge is enabled and if the token is correct
   * @param token - The token to verify
   * @param userAddress - The address of the user
   * @returns True if the challenge is disabled or the token is correct
   */
  async function verifyChallengeIfEnabled(token: string | undefined, userAddress: EthAddress) {
    const isChallengeEnabled = featureFlagsAdapter.isEnabled(Feature.TURNSTILE_VERIFICATION)

    logger.debug('CloudFlare challenge is enabled, verifying token', {
      userAddress,
      token: token ?? 'missing',
      isChallengeEnabled: isChallengeEnabled ? 'enabled' : 'disabled'
    })

    if (!isChallengeEnabled) {
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
