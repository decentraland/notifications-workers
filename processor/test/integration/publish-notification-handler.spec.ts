import { test } from '../components'
import { getIdentity, Identity } from '../utils'

test('POST /notifications', function ({ components, stubComponents }) {
  let identity: Identity
  beforeAll(async () => {
    identity = await getIdentity()
  })

  beforeEach(async () => {
    const { config } = stubComponents
    config.requireString.withArgs('INTERNAL_API_KEY').resolves('some-api-key')
  })

  async function findNotification(someEventKey: string, type: string, address: string) {
    const result = await components.pg.query(
      `SELECT *
         FROM notifications
         WHERE event_key = '${someEventKey}'
           AND type = '${type}'
           AND address = '${address.toLowerCase()}'`
    )
    return result.rows[0]
  }

  it('should publish a new notification', async () => {
    const { pg, db, localFetch } = components

    const notification = {
      eventKey: 'some-event-key',
      type: 'test',
      address: identity.realAccount.address,
      metadata: {
        test: `This is a test at ${new Date().toISOString()}`
      },
      timestamp: Date.now(),
      read_at: null
    }

    const response = await localFetch.fetch('/notifications', {
      method: 'POST',
      headers: {
        Authorization: `Bearer some-api-key`
      },
      body: JSON.stringify(notification)
    })

    expect(response.status).toEqual(204)

    const found = await findNotification('some-event-key', 'test', identity.realAccount.address)
    expect(found).toBeDefined()
    expect(found.metadata).toEqual(notification.metadata)
    expect(found.read_at).toBeNull()
    expect(found.timestamp).toEqual(`${notification.timestamp}`)
  })

  it('should be protected by api key', async () => {
    const { pg, db, localFetch } = components

    const response = await localFetch.fetch('/notifications', {
      method: 'POST',
      body: '{}'
    })

    expect(response.status).toEqual(401)
  })
})
