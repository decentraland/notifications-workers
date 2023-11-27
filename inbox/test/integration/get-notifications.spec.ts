import { test } from '../components'
import { getIdentity, Identity, makeRequest, randomNotification } from '../utils'

test('GET /notifications', function ({ components }) {
  let identity: Identity
  beforeAll(async () => {
    identity = await getIdentity()
  })

  beforeEach(async () => {
    const { pg } = components
    // await pg.query('TRUNCATE notifications, users_notifications')
  })

  it('should work', async () => {
    const { pg, db } = components

    console.log(identity.realAccount.address)

    const notificationEvent = randomNotification(identity.realAccount.address.toLowerCase())
    await pg.query(`
        INSERT INTO notifications (type, address, metadata, timestamp)
        VALUES ('test', '${identity.realAccount.address.toLowerCase()}', '${JSON.stringify(
      notificationEvent.metadata
    )}', ${notificationEvent.timestamp})
    `)

    const r = await makeRequest(components.localFetch, `/notifications`, identity)
    expect(r.status).toEqual(200)
    expect(await r.json()).toMatchObject([
      {
        address: identity.realAccount.address.toLowerCase(),
        type: 'test',
        metadata: {}
      }
    ])
  })
})
