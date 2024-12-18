import { HandlerContextWithPath } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { NotificationType } from '@dcl/schemas'
import { InvalidRequestError } from '@dcl/platform-server-commons'

export async function unsubscribeAllHandler(
  context: Pick<
    HandlerContextWithPath<
      'config' | 'dataWarehouseClient' | 'db' | 'logs' | 'pageRenderer' | 'profiles',
      '/unsubscribe/:address'
    >,
    'url' | 'components' | 'params'
  >
): Promise<IHttpServerComponent.IResponse> {
  const { config, dataWarehouseClient, db, logs, pageRenderer, profiles } = context.components

  const accountLink = await config.requireString('ACCOUNT_BASE_URL')

  const logger = logs.getLogger('unsubscription-handler')
  logger.info(`Unsubscribing ${context.params.address} from all notifications`)

  const address = context.params.address
  const subscription = await db.findSubscription(address)

  subscription.details.ignore_all_email = true
  await db.saveSubscriptionDetails(address, subscription.details)

  let userName

  const profile = await profiles.getByAddress(address)

  if (profile && profile.avatars && profile.avatars.length) {
    userName = profile.avatars[0].name
  }

  await dataWarehouseClient.sendEvent({
    context: 'notification_server',
    event: 'user_unsubscribed',
    body: {
      address: address,
      notification_type: 'all'
    }
  })

  return {
    status: 200,
    headers: {
      'Content-Type': 'text/html'
    },
    body: pageRenderer.renderPage('unsubscription-all', { address, accountLink, userName })
  }
}

export async function unsubscribeOneHandler(
  context: Pick<
    HandlerContextWithPath<
      'config' | 'dataWarehouseClient' | 'db' | 'logs' | 'pageRenderer',
      '/unsubscribe/:address/:notificationType'
    >,
    'components' | 'params'
  >
): Promise<IHttpServerComponent.IResponse> {
  const { config, dataWarehouseClient, db, logs, pageRenderer } = context.components

  const accountLink = await config.requireString('ACCOUNT_BASE_URL')

  const logger = logs.getLogger('unsubscription-handler')
  const address = context.params.address
  const notificationType = context.params.notificationType as NotificationType

  logger.info(`Unsubscribing ${address} for notification type ${notificationType}`)

  const subscription = await db.findSubscription(address)

  if (!Object.values(NotificationType).includes(notificationType)) {
    throw new InvalidRequestError(`Invalid notification type: ${notificationType}`)
  }

  subscription.details.message_type[notificationType]['email'] = false
  await db.saveSubscriptionDetails(address, subscription.details)

  await dataWarehouseClient.sendEvent({
    context: 'notification_server',
    event: 'user_unsubscribed',
    body: {
      address: address,
      notification_type: notificationType
    }
  })

  return {
    status: 200,
    headers: {
      'Content-Type': 'text/html'
    },
    body: pageRenderer.renderPage('unsubscription-one', { address, accountLink, notificationType })
  }
}
