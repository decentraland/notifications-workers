import { HandlerContextWithPath } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { EthAddress, Subscription, SubscriptionDetails } from '@dcl/schemas'
import { InvalidRequestError } from '@dcl/platform-server-commons'
import { DbComponent } from '@notifications/common'

type SubscriptionResponse = Subscription & {
  unconfirmedEmail: string | undefined
}

async function getSubscription(
  address: EthAddress,
  db: DbComponent
): Promise<{ email: string | undefined; unconfirmedEmail: string | undefined; details: SubscriptionDetails }> {
  const [subscription, unconfirmedEmail] = await Promise.all([
    db.findSubscription(address),
    db.findUnconfirmedEmail(address)
  ])

  return {
    email: subscription.email,
    unconfirmedEmail: unconfirmedEmail?.email,
    details: subscription.details
  }
}

export async function getSubscriptionHandler(
  context: Pick<HandlerContextWithPath<'db' | 'logs', '/subscription'>, 'url' | 'components' | 'verification'>
): Promise<IHttpServerComponent.IResponse> {
  const { db } = context.components

  const address = context.verification!.auth
  const subscription = await getSubscription(address, db)

  return {
    body: subscription as SubscriptionResponse
  }
}

export async function getSubscriptionAsAdminHandler(
  context: Pick<HandlerContextWithPath<'db' | 'logs', '/subscription/:address'>, 'url' | 'components' | 'params'>
): Promise<IHttpServerComponent.IResponse> {
  const {
    components: { db },
    params: { address }
  } = context

  if (!EthAddress.validate(address)) {
    throw new InvalidRequestError('Invalid address')
  }

  const subscription = await getSubscription(address, db)

  return {
    body: subscription as SubscriptionResponse
  }
}
