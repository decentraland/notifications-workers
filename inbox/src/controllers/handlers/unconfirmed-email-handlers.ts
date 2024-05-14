import { HandlerContextWithPath } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { InvalidRequestError, parseJson } from '@dcl/platform-server-commons'
import { Email } from '@dcl/schemas'
import { makeId } from '../../logic/utils'

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
    const code = makeId(32)
    await context.components.db.saveUnconfirmedEmail(address, body.email, code)
  }

  return {
    status: 204,
    body: ''
  }
}

export async function getUnconfirmedEmailHandler(
  context: Pick<HandlerContextWithPath<'db' | 'logs', '/unconfirmed-email'>, 'components' | 'verification'>
): Promise<IHttpServerComponent.IResponse> {
  const address = context.verification!.auth

  const unconfirmedEmail = await context.components.db.findUnconfirmedEmail(address)

  return {
    status: 200,
    body: {
      email: unconfirmedEmail?.email
    }
  }
}
