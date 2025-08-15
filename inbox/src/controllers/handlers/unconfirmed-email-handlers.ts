import { Feature, HandlerContextWithPath } from '../../types'
import { IConfigComponent, IHttpServerComponent } from '@well-known-components/interfaces'
import { InvalidRequestError, NotAuthorizedError, parseJson } from '@dcl/platform-server-commons'
import { Email, EthAddress } from '@dcl/schemas'
import { Email as Sendable } from '@notifications/common'
import { makeId } from '../../logic/utils'
import { InboxTemplates } from '../../adapters/email-renderer'
import { IFeatureFlagsAdapter } from '../../adapters/feature-flags-adapter'

const CODE_LENGTH = 32

const getConfirmEmailRoute = async (
  config: IConfigComponent,
  featureFlagsAdapter: IFeatureFlagsAdapter,
  address: EthAddress,
  code: string,
  isCreditsWorkflow: boolean
): Promise<string> => {
  const accountBaseUrl = await config.requireString('ACCOUNT_BASE_URL')
  const isChallengeEnabled = featureFlagsAdapter.isEnabled(Feature.TURNSTILE_VERIFICATION)

  if (isChallengeEnabled) {
    return `${accountBaseUrl}/confirm-email-challenge/${code}?address=${address}&source=${isCreditsWorkflow ? 'credits' : 'account'}`
  }

  if (isCreditsWorkflow) {
    return `${accountBaseUrl}/credits-email-confirmed/${code}?address=${address}`
  }

  //Accounts confirm-email route is unprotected after this change, so we need to add the address to the url.
  return `${accountBaseUrl}/confirm-email/${code}?address=${address}`
}

export async function storeUnconfirmedEmailHandler(
  context: Pick<
    HandlerContextWithPath<
      | 'config'
      | 'dataWarehouseClient'
      | 'db'
      | 'emailRenderer'
      | 'sendGridClient'
      | 'profiles'
      | 'logs'
      | 'featureFlagsAdapter'
      | 'domainValidator',
      '/set-email'
    >,
    'url' | 'request' | 'components' | 'verification'
  >
): Promise<IHttpServerComponent.IResponse> {
  const {
    config,
    dataWarehouseClient,
    db,
    emailRenderer,
    sendGridClient,
    profiles,
    featureFlagsAdapter,
    domainValidator
  } = context.components
  const address = context.verification!.auth
  const env = await config.requireString('ENV')

  const body = await parseJson<{ email: string; redirect?: string; isCreditsWorkflow?: boolean }>(context.request)
  if (body.email !== '' && !Email.validate(body.email)) {
    throw new InvalidRequestError('Invalid email')
  }

  const subscription = await db.findSubscription(address)
  if (body.email === '') {
    subscription.email = undefined
    subscription.details.ignore_all_email = true
    await db.saveSubscriptionEmail(address, undefined)
    await db.saveSubscriptionDetails(address, subscription.details)
    await db.deleteUnconfirmedEmail(address)
  } else if (subscription.email === body.email) {
    await db.deleteUnconfirmedEmail(address)
  } else {
    if (await domainValidator.isDomainBlacklisted(body.email)) {
      throw new InvalidRequestError('Email domain not allowed')
    }

    const accountBaseUrl = await config.requireString('ACCOUNT_BASE_URL')
    const code = makeId(CODE_LENGTH)
    await db.saveUnconfirmedEmail(address, body.email, code)

    let userName

    const profile = await profiles.getByAddress(address)

    if (profile && profile.avatars && profile.avatars.length) {
      userName = profile.avatars[0].name
    }

    const confirmationUrl = await getConfirmEmailRoute(
      config,
      featureFlagsAdapter,
      address,
      code,
      body.isCreditsWorkflow ?? false
    )

    const emailTemplate = !!body.isCreditsWorkflow
      ? InboxTemplates.VALIDATE_CREDITS_EMAIL
      : InboxTemplates.VALIDATE_EMAIL

    const email: Sendable = {
      ...(await emailRenderer.renderEmail(emailTemplate, body.email, {
        validateButtonLink: confirmationUrl,
        validateButtonText: 'Click Here to Confirm Your Email',
        userName,
        accountBaseUrl
      }))
    }
    await sendGridClient.sendEmail(email, {
      environment: env,
      email_type: 'validation_attempt'
    })
    await dataWarehouseClient.sendEvent({
      context: 'notification_server',
      event: 'email_validation_started',
      body: {
        address,
        email_to_validate: body.email,
        is_credits_workflow: body.isCreditsWorkflow ?? false
      }
    })
  }

  return {
    status: 204,
    body: ''
  }
}

export async function confirmEmailHandler(
  context: Pick<
    HandlerContextWithPath<
      'dataWarehouseClient' | 'db' | 'logs' | 'challengerAdapter' | 'domainValidator',
      '/confirm-email'
    >,
    'components' | 'request' | 'verification' | 'url'
  >
): Promise<IHttpServerComponent.IResponse> {
  const { dataWarehouseClient, challengerAdapter, db, domainValidator } = context.components
  const body = await parseJson<{ address: string; code: string; turnstileToken?: string; source?: string }>(
    context.request
  )

  const logger = context.components.logs.getLogger('confirm-email-handler')

  const address = body.address
  if (!address || !EthAddress.validate(address)) {
    throw new InvalidRequestError('Missing address')
  }

  const code = body.code
  if (!code || code.length !== CODE_LENGTH) {
    throw new InvalidRequestError('Missing code')
  }

  const { errorCodes, result } = await challengerAdapter.verifyChallengeIfEnabled(body.turnstileToken, address)

  if (!result) {
    logger.debug('Captcha validation failed', {
      errorCodes: JSON.stringify(errorCodes),
      address,
      code,
      turnstileToken: body.turnstileToken ?? ''
    })

    await dataWarehouseClient.sendEvent({
      context: 'notification_server',
      event: 'email_validation_failed',
      body: {
        address,
        error: 'captcha_validation_failed',
        is_credits_workflow: body.source === 'credits',
        error_codes: JSON.stringify(errorCodes)
      }
    })

    throw new NotAuthorizedError('Invalid captcha')
  }

  const unconfirmedEmail = await db.findUnconfirmedEmail(address)
  if (!unconfirmedEmail) {
    throw new InvalidRequestError('No unconfirmed email for this address')
  }

  if (unconfirmedEmail.code !== code) {
    throw new InvalidRequestError('Invalid code')
  }

  if (await domainValidator.isDomainBlacklisted(unconfirmedEmail.email)) {
    throw new InvalidRequestError('Email domain not allowed')
  }

  const subscription = await db.findSubscription(address)
  subscription.email = unconfirmedEmail.email

  await db.saveSubscriptionEmail(address, unconfirmedEmail.email)
  await db.deleteUnconfirmedEmail(address)
  await dataWarehouseClient.sendEvent({
    context: 'notification_server',
    event: 'email_validated',
    body: {
      address,
      validated_email: unconfirmedEmail.email,
      is_credits_workflow: body.source === 'credits'
    }
  })

  return {
    status: 204,
    body: ''
  }
}
