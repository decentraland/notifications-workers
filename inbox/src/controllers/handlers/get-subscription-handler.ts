import { HandlerContextWithPath } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'

export async function getSubscriptionHandler(
  context: Pick<HandlerContextWithPath<'db' | 'logs', '/subscription'>, 'url' | 'components' | 'verification'>
): Promise<IHttpServerComponent.IResponse> {
  const { db } = context.components

  const address = context.verification!.auth
  const subscription = await db.findSubscription(address)

  return {
    body: {
      email: subscription.email,
      details: subscription.details
    }
  }
}
