import { HandlerContextWithPath } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { Subscription } from '@dcl/schemas'

type SubscriptionResponse = Subscription & {
  unconfirmedEmail: string | undefined
}

export async function getSubscriptionHandler(
  context: Pick<HandlerContextWithPath<'db' | 'logs', '/subscription'>, 'url' | 'components' | 'verification'>
): Promise<IHttpServerComponent.IResponse> {
  const { db } = context.components

  const address = context.verification!.auth
  const [subscription, unconfirmedEmail] = await Promise.all([
    db.findSubscription(address),
    db.findUnconfirmedEmail(address)
  ])

  return {
    body: {
      email: subscription.email,
      unconfirmedEmail: unconfirmedEmail?.email,
      details: subscription.details
    } as SubscriptionResponse
  }
}
