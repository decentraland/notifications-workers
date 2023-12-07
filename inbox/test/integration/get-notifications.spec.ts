import { test } from '../components'
import { getIdentity, Identity, makeRequest, randomNotification } from '../utils'
import SQL from 'sql-template-strings'

test('GET /notifications', function ({ components }) {
  let identity: Identity
  beforeEach(async () => {
    identity = await getIdentity()
  })

  it('should work', async () => {
    const { pg, db } = components

    const notificationEvent = randomNotification(identity.realAccount.address.toLowerCase())
    await pg.query(SQL`
        INSERT INTO notifications (event_key, type, address, metadata, timestamp, created_at, updated_at)
        VALUES (${notificationEvent.event_key},
                ${notificationEvent.type},
                ${identity.realAccount.address.toLowerCase()},
                ${notificationEvent.metadata}::jsonb,
                ${notificationEvent.timestamp},
                ${notificationEvent.created_at},
                ${notificationEvent.updated_at});
    `)

    const r = await makeRequest(components.localFetch, `/notifications`, identity)
    expect(r.status).toEqual(200)
    expect(await r.json()).toMatchObject({
      notifications: [
        {
          address: identity.realAccount.address.toLowerCase(),
          type: notificationEvent.type,
          metadata: notificationEvent.metadata
        }
      ]
    })
  })
})
