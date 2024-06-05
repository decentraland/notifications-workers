import { HandlerContextWithPath } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { InvalidRequestError, parseJson } from '@dcl/platform-server-commons'
import { SubscriptionDetails } from '@dcl/schemas'

export async function putSubscriptionHandler(
  context: Pick<
    HandlerContextWithPath<'dataWarehouseClient' | 'db' | 'logs', '/subscription'>,
    'url' | 'request' | 'components' | 'verification'
  >
): Promise<IHttpServerComponent.IResponse> {
  const logger = context.components.logs.getLogger('put-subscription-handler')
  const address = context.verification!.auth
  const body = await parseJson<SubscriptionDetails>(context.request)

  if (!SubscriptionDetails.validate(body)) {
    const message = userFriendlyErrorMessage(SubscriptionDetails.validate.errors || [])
    logger.warn(`Invalid subscription : ${message}. Received body: ${JSON.stringify(body)}`)
    throw new InvalidRequestError(message)
  }

  await context.components.db.saveSubscriptionDetails(address, body)
  await context.components.dataWarehouseClient.sendEvent({
    context: 'notification_server',
    event: 'subscription_changed',
    body: {
      subscription_details: body
    }
  })

  return {
    status: 204,
    body: ''
  }
}

function userFriendlyErrorMessage(validationErrors: any[]): string {
  const missingPropertyErrors = validationErrors.filter((e) => e.keyword === 'required')
  if (missingPropertyErrors.length !== 0) {
    const missingMessageTypes = missingPropertyErrors.filter((e) => e.instancePath === '/message_type')
    if (missingMessageTypes.length !== 0) {
      return `Invalid subscription. Missing configuration for the following message types: ${missingMessageTypes.map((e) => e.params.missingProperty).join(', ')}`
    }
    return `Invalid subscription. Missing required fields: ${missingPropertyErrors.map((e) => e.params.missingProperty).join(', ')}`
  }
  return `Invalid subscription. ${validationErrors.map((e) => `${e.instancePath.substring(1)} ${e.message}`).join(', ')}`
}
