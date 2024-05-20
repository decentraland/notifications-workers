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
    HandlerContextWithPath<'config' | 'db' | 'emailRenderer' | 'sendGridClient', '/set-email'>,
    'url' | 'request' | 'components' | 'verification'
  >
): Promise<IHttpServerComponent.IResponse> {
  const { config, db, emailRenderer, sendGridClient } = context.components

  const address = context.verification!.auth

  const body = await parseJson<{ email: string }>(context.request)
  if (body.email !== '' && !Email.validate(body.email)) {
    throw new InvalidRequestError('Invalid email')
  }

  if (body.email === '') {
    const subscription = await db.findSubscription(address)
    subscription.email = undefined
    subscription.details.ignore_all_email = true
    await db.saveSubscriptionEmail(address, '')
    await db.saveSubscriptionDetails(address, subscription.details)
    await db.deleteUnconfirmedEmail(address)
  } else {
    const subscription = await db.findSubscription(address)
    if (subscription.email !== body.email) {
      const accountBaseUrl = await config.requireString('ACCOUNT_BASE_URL')
      const code = makeId(CODE_LENGTH)
      await db.saveUnconfirmedEmail(address, body.email, code)
      const email: Sendable = {
        ...(await emailRenderer.renderEmail(InboxTemplates.VALIDATE_EMAIL, body.email, {})),
        actionButtonLink: `${accountBaseUrl}/confirm-email/${code}`,
        actionButtonText: 'Click Here to Confirm Your Email'
      }
      await sendGridClient.sendEmail(email)
    }
  }

  return {
    status: 204,
    body: ''
  }
}

export async function confirmEmailHandler(
  context: Pick<HandlerContextWithPath<'db' | 'logs', '/confirm-email'>, 'components' | 'request' | 'verification'>
): Promise<IHttpServerComponent.IResponse> {
  const { db } = context.components
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

  return {
    status: 204,
    body: ''
  }
}
