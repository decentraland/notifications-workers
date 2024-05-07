import { HandlerContextWithPath } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { InvalidRequestError, parseJson } from '@dcl/platform-server-commons'
import { EthAddress, SubscriptionDetails } from '@dcl/schemas'

export async function putSubscriptionHandler(
  context: Pick<
    HandlerContextWithPath<'db' | 'logs', '/subscription'>,
    'url' | 'request' | 'components' | 'verification'
  >
): Promise<IHttpServerComponent.IResponse> {
  const address = context.verification!.auth
  const body = await parseJson<SubscriptionDetails>(context.request)

  if (!EthAddress.validate(address)) {
    throw new InvalidRequestError(`Invalid address: ${address}`)
  }
  if (!SubscriptionDetails.validate(body)) {
    throw new InvalidRequestError(`Invalid subscription`)
  }

  await context.components.db.saveSubscription(address, body)

  return {
    status: 204,
    body: ''
  }
}
