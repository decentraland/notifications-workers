import { AppComponents, Feature } from '../types'

export interface IDomainValidator {
  isDomainBlacklisted: (email: string) => Promise<boolean>
}

export function createEmailDomainValidator({ featureFlagsAdapter }: Pick<AppComponents, 'featureFlagsAdapter'>) {
  async function isDomainBlacklisted(email: string): Promise<boolean> {
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

    const emailSplitted = email.split('@')[1]

    if (emailSplitted.length !== 2) {
      return true
    }

    const [_, domain] = emailSplitted

    return blacklistedDomains.map((domain) => domain.toLowerCase()).includes(domain.toLowerCase())
  }

  return {
    isDomainBlacklisted
  }
}
