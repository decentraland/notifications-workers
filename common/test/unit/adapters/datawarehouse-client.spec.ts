import { IConfigComponent, IFetchComponent, ILoggerComponent } from '@well-known-components/interfaces'
import { createConfigComponent } from '@well-known-components/env-config-provider'
import { createLogComponent } from '@well-known-components/logger'
import { createDataWarehouseClient, Event } from '../../../src'

describe('data-warehouse client tests', () => {
  let logs: ILoggerComponent
  let fetch: IFetchComponent
  let config: IConfigComponent

  beforeEach(async () => {
    logs = await createLogComponent({})
    fetch = {
      fetch: jest.fn()
    }
  })

  describe('with DwhGenericEventsClient', () => {
    beforeEach(() => {
      config = createConfigComponent({
        ENV: 'test',
        DWH_API_URL: 'https://some-url.com',
        DWH_TOKEN: 'my-key'
      })
    })

    test('should create real client', async () => {
      const dataWarehouseClient = await createDataWarehouseClient({ config, fetch, logs })
      expect(dataWarehouseClient).toBeDefined()
    })

    test('should send event with real client', async () => {
      const event: Event = {
        context: 'notification_server',
        event: 'email_sent',
        body: {
          email: 'email@example.org'
        }
      }

      const dataWarehouseClient = await createDataWarehouseClient({ config, fetch, logs })
      await dataWarehouseClient.sendEvent(event)

      expect(fetch.fetch).toHaveBeenCalledWith('https://some-url.com', {
        body: JSON.stringify({
          context: 'notification_server',
          event: 'email_sent',
          body: { email: 'email@example.org', env: 'test' }
        }),
        headers: {
          Authorization: 'Bearer my-key',
          'Content-Type': 'application/json'
        },
        method: 'POST'
      })
    })
  })

  describe('with DummyDataWarehouseClient', () => {
    beforeEach(() => {
      config = createConfigComponent({
        ENV: 'test'
      })
    })

    test('should create real client', async () => {
      const dataWarehouseClient = await createDataWarehouseClient({ config, fetch, logs })
      expect(dataWarehouseClient).toBeDefined()
    })

    test('should not do anything', async () => {
      const event: Event = {
        context: 'notification_server',
        event: 'email_sent',
        body: {
          email: 'email@example.org'
        }
      }

      const dataWarehouseClient = await createDataWarehouseClient({ config, fetch, logs })
      await dataWarehouseClient.sendEvent(event)
    })
  })
})
