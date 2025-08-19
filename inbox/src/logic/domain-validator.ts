import { AppComponents, Feature } from '../types'

export interface IDomainValidator {
  isDomainBlacklisted: (email: string) => Promise<boolean>
}

const DISPOSABLE_EMAIL_LIST_URL = 'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf'
const CACHE_REFRESH_INTERVAL = 1 * 60 * 60 * 1000 // 1 hour in milliseconds

export function createEmailDomainValidator({
  featureFlagsAdapter,
  logs,
  fetch
}: Pick<AppComponents, 'featureFlagsAdapter' | 'logs' | 'fetch'>) {
  const logger = logs.getLogger('domain-validator')
  let disposableDomains: Set<string> = new Set()
  let lastRefresh: number = 0

  async function fetchDisposableDomains(): Promise<void> {
    try {
      logger.info('Fetching disposable email domains list')
      const response = await fetch.fetch(DISPOSABLE_EMAIL_LIST_URL)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch disposable email domains: ${response.status} ${response.statusText}`)
      }

      const content = await response.text()
      const domains = content
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line && !line.startsWith('#')) // Remove comments and empty lines
        .map((domain: string) => domain.toLowerCase())

      disposableDomains = new Set(domains)
      lastRefresh = Date.now()
      
      logger.info('Successfully fetched disposable email domains', {
        count: disposableDomains.size,
        lastRefresh: new Date(lastRefresh).toISOString()
      })
    } catch (error) {
      logger.error('Failed to fetch disposable email domains', {
        error: error instanceof Error ? error.message : String(error),
        url: DISPOSABLE_EMAIL_LIST_URL
      })
      
      // If we have cached domains, continue using them
      if (disposableDomains.size > 0) {
        logger.warn('Continuing to use cached disposable email domains due to fetch failure')
      }
    }
  }

  async function isDomainBlacklisted(email: string): Promise<boolean> {
    // First check if it's a disposable email (always enabled)
    if (disposableDomains.size === 0 || Date.now() - lastRefresh > CACHE_REFRESH_INTERVAL) {
      await fetchDisposableDomains()
    }

    const emailParts = email.split('@')
    if (emailParts.length !== 2) {
      return true // Invalid email format
    }

    const domain = emailParts[1].toLowerCase()
    const isDisposable = disposableDomains.has(domain)

    if (isDisposable) {
      logger.info('Email domain is disposable and blocked', { email, domain })
      return true
    }

    // Then check feature flag-based blacklist (if enabled)
    const isDomainValidationEnabled = featureFlagsAdapter.isEnabled(Feature.CREDITS_BLACKLISTED_EMAILS_DOMAIN)
    if (!isDomainValidationEnabled) {
      return false
    }

    const blacklistedDomains: string[] | undefined = await featureFlagsAdapter.getVariants<string[]>(
      Feature.CREDITS_BLACKLISTED_EMAILS_DOMAIN
    )

    if (!blacklistedDomains) {
      return false
    }

    logger.info('Checking if domain is blacklisted', {
      domain,
      blacklistedDomains: blacklistedDomains.join(', ')
    })

    return blacklistedDomains.map((domain) => domain.toLowerCase()).includes(domain.toLowerCase())
  }

  return {
    isDomainBlacklisted
  }
}
