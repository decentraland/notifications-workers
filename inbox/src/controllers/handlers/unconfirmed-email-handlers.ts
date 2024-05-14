import { HandlerContextWithPath } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { InvalidRequestError, parseJson } from '@dcl/platform-server-commons'
import { Email, EthAddress } from '@dcl/schemas'
import { makeId } from '../../logic/utils'

const CODE_LENGTH = 32

export async function storeUnconfirmedEmailHandler(
  context: Pick<HandlerContextWithPath<'db' | 'logs', '/set-email'>, 'url' | 'request' | 'components' | 'verification'>
): Promise<IHttpServerComponent.IResponse> {
  const address = context.verification!.auth

  const body = await parseJson<{ email: string }>(context.request)
  if (body.email !== '' && !Email.validate(body.email)) {
    throw new InvalidRequestError('Invalid email')
  }

  if (body.email === '') {
    const subscription = await context.components.db.findSubscription(address)
    subscription.email = undefined
    subscription.details.ignore_all_email = true
    await context.components.db.saveSubscriptionEmail(address, '')
    await context.components.db.saveSubscription(address, subscription.details)
    await context.components.db.deleteUnconfirmedEmail(address)
  } else {
    const code = makeId(CODE_LENGTH)
    await context.components.db.saveUnconfirmedEmail(address, body.email, code)
  }

  return {
    status: 204,
    body: ''
  }
}

export async function confirmEmailHandler(
  context: Pick<
    HandlerContextWithPath<'config' | 'db' | 'logs', '/confirm-email'>,
    'components' | 'url' | 'verification'
  >
): Promise<IHttpServerComponent.IResponse> {
  const urlSearchParams = new URL(context.url).searchParams

  const address = urlSearchParams.get('address')
  if (!address || !EthAddress.validate(address)) {
    throw new InvalidRequestError('Missing address')
  }

  const code = urlSearchParams.get('code')
  if (!code || code.length !== CODE_LENGTH) {
    throw new InvalidRequestError('Missing code')
  }

  const unconfirmedEmail = await context.components.db.findUnconfirmedEmail(address)
  if (!unconfirmedEmail) {
    throw new InvalidRequestError('No unconfirmed email for this address')
  }

  if (unconfirmedEmail.code !== code) {
    throw new InvalidRequestError('Invalid code')
  }

  const subscription = await context.components.db.findSubscription(address)
  subscription.email = unconfirmedEmail.email

  await context.components.db.saveSubscription(address, subscription.details)
  await context.components.db.deleteUnconfirmedEmail(address)

  const accountUrl = await context.components.config.requireString('ACCOUNT_BASE_URL')

  return {
    status: 301,
    headers: {
      Location: accountUrl
    }
  }
}
