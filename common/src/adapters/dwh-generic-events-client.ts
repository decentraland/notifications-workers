import { IConfigComponent, IFetchComponent, ILoggerComponent } from '@well-known-components/interfaces'

export type Event = {
  context: 'notification_server'
  event: 'email_sent' | 'email_changed' | 'email_validated' | 'subscription_changed' | 'user_unsubscribed'
  body: {
    env: 'prd'
    notification_id: string
    sendgrid_response: any
  }
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
  const { fetch, logs, config } = components
  const [apiBaseUrl, apiToken] = await Promise.all([config.getString('DWH_API_URL'), config.getString('DWH_TOKEN')])

  if (!apiBaseUrl || !apiToken) {
    return createDummyDwhGenericEventsClient({ logs })
  }

  return createDwhGenericEventsClient({ config, fetch, logs })
}

export async function createDwhGenericEventsClient(
  components: Pick<IDwhGenericEventsClientComponents, 'config' | 'fetch' | 'logs'>
): Promise<IDataWarehouseClient> {
  const { fetch, logs, config } = components
  const logger = logs.getLogger('dwh-generic-events-client')
  logger.info('Creating DWH generic events client')

  const [apiBaseUrl, apiToken] = await Promise.all([
    config.requireString('DWH_API_URL'),
    config.requireString('DWH_TOKEN')
  ])

  async function sendEvent(event: Event): Promise<void> {
    logger.info(`Sending event to DataWarehouse ${event.event}"`)

    const response = await fetch.fetch(apiBaseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    })
    console.log('response', response)
  }

  return {
    sendEvent
  }
}

export async function createDummyDwhGenericEventsClient(
  components: Pick<IDwhGenericEventsClientComponents, 'logs'>
): Promise<IDataWarehouseClient> {
  const { logs } = components
  const logger = logs.getLogger('dummy-dwh-generic-events-client')
  logger.info('Creating dummy DWH generic events client')

  async function sendEvent(event: Event): Promise<void> {
    logger.debug(`Not sending event to DataWarehouse ${event.event}"`)
  }

  return {
    sendEvent
  }
}
