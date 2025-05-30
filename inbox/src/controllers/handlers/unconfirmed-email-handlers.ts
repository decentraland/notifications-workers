import { HandlerContextWithPath } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { InvalidRequestError, parseJson } from '@dcl/platform-server-commons'
import { Email, EthAddress } from '@dcl/schemas'
import { Email as Sendable } from '@notifications/common'
import { makeId } from '../../logic/utils'
import { InboxTemplates } from '../../adapters/email-renderer'

const CODE_LENGTH = 32

export async function storeUnconfirmedEmailHandler(
  context: Pick<
    HandlerContextWithPath<
      'config' | 'dataWarehouseClient' | 'db' | 'emailRenderer' | 'sendGridClient' | 'profiles' | 'logs',
      '/set-email'
    >,
    'url' | 'request' | 'components' | 'verification'
  >
): Promise<IHttpServerComponent.IResponse> {
  const { config, dataWarehouseClient, db, emailRenderer, sendGridClient, profiles } = context.components
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
    const accountBaseUrl = await config.requireString('ACCOUNT_BASE_URL')
    const code = makeId(CODE_LENGTH)
    await db.saveUnconfirmedEmail(address, body.email, code)

    let userName

    const profile = await profiles.getByAddress(address)

    if (profile && profile.avatars && profile.avatars.length) {
      userName = profile.avatars[0].name
    }

    const creditsConfirmationUrl = `${accountBaseUrl}/credits-email-confirmed/${code}?address=${address}${body.redirect ? `?redirect=${encodeURIComponent(body.redirect)}` : ''}`
    const normalConfirmationUrl = `${accountBaseUrl}/confirm-email/${code}${body.redirect ? `?redirect=${encodeURIComponent(body.redirect)}` : ''}`

    const emailTemplate = !!body.isCreditsWorkflow
      ? InboxTemplates.VALIDATE_CREDITS_EMAIL
      : InboxTemplates.VALIDATE_EMAIL

    const email: Sendable = {
      ...(await emailRenderer.renderEmail(emailTemplate, body.email, {
        validateButtonLink: !!body.isCreditsWorkflow ? creditsConfirmationUrl : normalConfirmationUrl,
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
        email_to_validate: body.email
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
    HandlerContextWithPath<'dataWarehouseClient' | 'db' | 'logs', '/confirm-email'>,
    'components' | 'request' | 'verification' | 'url'
  >
): Promise<IHttpServerComponent.IResponse> {
  const { dataWarehouseClient, db } = context.components
  const body = await parseJson<{ address: string; code: string }>(context.request)

  const address = body.address
  if (!address || !EthAddress.validate(address)) {
    throw new InvalidRequestError('Missing address')
  }

  const code = body.code
  if (!code || code.length !== CODE_LENGTH) {
    throw new InvalidRequestError('Missing code')
  }

  const unconfirmedEmail = await db.findUnconfirmedEmail(address)
  if (!unconfirmedEmail) {
    throw new InvalidRequestError('No unconfirmed email for this address')
  }

  if (unconfirmedEmail.code !== code) {
    throw new InvalidRequestError('Invalid code')
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
      validated_email: unconfirmedEmail.email
    }
  })

  return {
    status: 204,
    body: ''
  }
}
