import { test } from '../components'
import { getIdentity, Identity, makeRequest, randomNotification } from '../utils'
import { createNotification, findNotifications } from '../db'

test('PUT /notifications/read', function ({ components }) {
  let identity: Identity
  beforeEach(async () => {
    identity = await getIdentity()
  })

  it('should work', async () => {
    const { pg } = components

    const notificationEvent = randomNotification(identity.realAccount.address.toLowerCase())
    await createNotification({ pg }, notificationEvent)

    const broadcastNotificationEvent = randomNotification(undefined)
    await createNotification({ pg }, broadcastNotificationEvent)

    const r = await makeRequest(components.localFetch, `/notifications/read`, identity, {
      method: 'PUT',
      body: JSON.stringify({ notificationIds: [notificationEvent.id, broadcastNotificationEvent.id] })
    })
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({ updated: 2 })

    const fromDb = await findNotifications({ pg }, [notificationEvent.id, broadcastNotificationEvent.id])

    const foundNotification = fromDb.find((notification) => notification.id === notificationEvent.id)
    expect(foundNotification).toBeTruthy()
    expect(foundNotification).toMatchObject({
      id: notificationEvent.id,
      address: identity.realAccount.address.toLowerCase(),
      type: notificationEvent.type,
      metadata: notificationEvent.metadata,
      read_at: expect.any(String),
      broadcast_read_at: null
    })

    const foundBroadcastNotification = fromDb.find((notification) => notification.id === broadcastNotificationEvent.id)
    expect(foundBroadcastNotification).toBeTruthy()
    expect(foundBroadcastNotification).toMatchObject({
      id: broadcastNotificationEvent.id,
      address: null,
      type: broadcastNotificationEvent.type,
      metadata: broadcastNotificationEvent.metadata,
      read_at: null,
      broadcast_read_at: expect.any(String)
    })
  })
})
