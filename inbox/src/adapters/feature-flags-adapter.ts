import { IBaseComponent, START_COMPONENT, STOP_COMPONENT } from '@well-known-components/interfaces'
import { AppComponents, Feature } from '../types'
import { ApplicationName } from '@well-known-components/features-component'

export type IFeatureFlagsAdapter = IBaseComponent & {
  refreshFeatureFlags: () => Promise<void>
  isEnabled: (feature: Feature) => boolean
  getVariants: <T>(feature: Feature) => Promise<T | undefined>
}

// How often to refresh feature flags (4 minutes in milliseconds)
const FEATURE_FLAG_REFRESH_INTERVAL = 4 * 60 * 1000

export async function createFeatureFlagsAdapter(
  components: Pick<AppComponents, 'logs' | 'features'>
): Promise<IFeatureFlagsAdapter> {
  const { logs, features } = components

  const logger = logs.getLogger('feature-flags-adapter')
  const featuresFlagMap = new Map<Feature, boolean>()

  let refreshInterval: NodeJS.Timeout | null = null

  async function refreshFeatureFlags() {
    try {
      // Get Turnstile Verification feature flag
      const isTurnstileVerificationEnabled = await features.getIsFeatureEnabled(
        ApplicationName.DAPPS,
        Feature.TURNSTILE_VERIFICATION
      )
      logger.debug('Refreshed Turnstile Verification feature flag', {
        isEnabled: isTurnstileVerificationEnabled ? 'enabled' : 'disabled'
      })

      featuresFlagMap.set(Feature.TURNSTILE_VERIFICATION, isTurnstileVerificationEnabled)

      // Get Credits Blacklisted Emails Domain feature flag
      const isCreditsBlacklistedEmailsDomainEnabled = await features.getIsFeatureEnabled(
        ApplicationName.DAPPS,
        Feature.CREDITS_BLACKLISTED_EMAILS_DOMAIN
      )
      logger.debug('Refreshed Credits Blacklisted Emails Domain feature flag', {
        isEnabled: isCreditsBlacklistedEmailsDomainEnabled ? 'enabled' : 'disabled'
      })

      featuresFlagMap.set(Feature.CREDITS_BLACKLISTED_EMAILS_DOMAIN, isCreditsBlacklistedEmailsDomainEnabled)
    } catch (error) {
      logger.error('Failed to refresh feature flags', {
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  async function getVariants<T>(feature: Feature): Promise<T | undefined> {
    const variant = await features.getFeatureVariant(ApplicationName.DAPPS, feature)

    if (variant?.payload?.value) {
      const values = variant.payload.value
        .replace('\n', '')
        .split(',')
        .map((domain) => domain.toLowerCase().trim())

      return values as T
    }

    return undefined
  }

  /**
   * Start component and initialize periodic feature flag refresh
   */
  async function start() {
    logger.info('Starting feature flags adapter')

    // Do initial refresh
    await refreshFeatureFlags()

    // Set up periodic refresh
    refreshInterval = setInterval(async () => {
      await refreshFeatureFlags()
    }, FEATURE_FLAG_REFRESH_INTERVAL)

    logger.info('Feature flags adapter started', {
      refreshInterval: FEATURE_FLAG_REFRESH_INTERVAL / 1000 / 60 + ' minutes'
    })
  }

  /**
   * Stop component and clear interval
   */
  async function stop() {
    logger.info('Stopping feature flags adapter')

    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
  }

  return {
    [START_COMPONENT]: start,
    [STOP_COMPONENT]: stop,
    refreshFeatureFlags,
    isEnabled: (feature: Feature) => {
      return featuresFlagMap.get(feature) ?? false
    },
    getVariants
  }
}
