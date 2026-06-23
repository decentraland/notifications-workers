import { IConfigComponent, ILoggerComponent } from '@well-known-components/interfaces'
import { IFetchComponent } from '@dcl/core-commons'

export type Event = {
  context: 'notification_server'
  event:
    | 'email_sent'
    | 'email_validation_started'
    | 'email_validated'
    | 'subscription_changed'
    | 'user_unsubscribed'
    | 'email_validation_failed'
  body: {
    env: 'prd' | 'dev'
  } & any
}

export type IDataWarehouseClient = {
  sendEvent: (event: Event) => Promise<void>
}

export type IDwhGenericEventsClientComponents = {
  config: IConfigComponent
  logs: ILoggerComponent
  fetch: IFetchComponent
}

export async function createDataWarehouseClient(
  components: Pick<IDwhGenericEventsClientComponents, 'config' | 'fetch' | 'logs'>
): Promise<IDataWarehouseClient> {
  const { config } = components

  const [apiBaseUrl, apiToken] = await Promise.all([config.getString('DWH_API_URL'), config.getString('DWH_TOKEN')])
  if (!apiBaseUrl || !apiToken) {
    return createDummyDataWarehouseClient(components)
  }

  return createDwhGenericEventsClient(components)
}

export async function createDwhGenericEventsClient(
  components: Pick<IDwhGenericEventsClientComponents, 'config' | 'fetch' | 'logs'>
): Promise<IDataWarehouseClient> {
  const { fetch, logs, config } = components
  const logger = logs.getLogger('dwh-generic-events-client')
  logger.info('Creating DWH generic events client')

  const [env, apiBaseUrl, apiToken] = await Promise.all([
    config.requireString('ENV'),
    config.requireString('DWH_API_URL'),
    config.requireString('DWH_TOKEN')
  ])

  async function sendEvent(event: Event): Promise<void> {
    logger.info(`Sending event to DataWarehouse ${event.event}"`)

    const response = await fetch.fetch(apiBaseUrl, {
      method: 'POST',
      headers: {
        'x-token': apiToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...event,
        body: {
          ...event.body,
          env
        }
      })
    })

    // The response is not consumed, so cancel its body to avoid leaking the connection.
    await response?.body?.cancel().catch(() => undefined)
  }

  return {
    sendEvent
  }
}

export async function createDummyDataWarehouseClient(
  components: Pick<IDwhGenericEventsClientComponents, 'logs'>
): Promise<IDataWarehouseClient> {
  const { logs } = components
  const logger = logs.getLogger('dummy-data-warehouse-client')
  logger.info('Creating dummy DataWarehouse client')

  async function sendEvent(event: Event): Promise<void> {
    logger.debug(`Not sending event ${event.event}" to DataWarehouse`)
  }

  return {
    sendEvent
  }
}
