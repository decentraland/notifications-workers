import { test } from '../components'
import { getIdentity, Identity, makeRequest, randomNotification } from '../utils'
import SQL from 'sql-template-strings'

test('GET /notifications', function ({ components }) {
  let identity: Identity
  beforeEach(async () => {
    identity = await getIdentity()
  })

  it('should work', async () => {
    const { pg } = components

    const notificationEvent = randomNotification(identity.realAccount.address.toLowerCase())
    const queryResult = await pg.query(SQL`
        INSERT INTO notifications (event_key, type, address, metadata, timestamp, created_at, updated_at)
        VALUES (${notificationEvent.event_key},
                ${notificationEvent.type},
                ${identity.realAccount.address.toLowerCase()},
                ${notificationEvent.metadata}::jsonb,
                ${notificationEvent.timestamp},
                ${notificationEvent.created_at},
                ${notificationEvent.updated_at})
        RETURNING id;
    `)
    const notificationId = queryResult.rows[0].id

    const r = await makeRequest(components.localFetch, `/notifications`, identity)
    expect(r.status).toBe(200)
    const response = await r.json()
    const found = response.notifications.find((notification: any) => notification.id === notificationId)
    expect(found).toBeTruthy()
    expect(found).toMatchObject({
      id: notificationId,
      address: identity.realAccount.address.toLowerCase(),
      type: notificationEvent.type,
      metadata: notificationEvent.metadata
    })
  })
})
