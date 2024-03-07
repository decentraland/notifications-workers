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

    const broadcastNotification2Event = randomNotification(undefined)
    await createNotification({ pg }, broadcastNotification2Event)

    const r = await makeRequest(components.localFetch, `/notifications/read`, identity, {
      method: 'PUT',
      body: JSON.stringify({
        notificationIds: [notificationEvent.id, broadcastNotificationEvent.id, broadcastNotification2Event.id]
      })
    })
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({ updated: 3 })

    const fromDb = await findNotifications({ pg }, [
      notificationEvent.id,
      broadcastNotificationEvent.id,
      broadcastNotification2Event.id
    ])

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

    const foundBroadcastNotification2 = fromDb.find(
      (notification) => notification.id === broadcastNotification2Event.id
    )
    expect(foundBroadcastNotification2).toBeTruthy()
    expect(foundBroadcastNotification2).toMatchObject({
      id: broadcastNotification2Event.id,
      address: null,
      type: broadcastNotification2Event.type,
      metadata: broadcastNotification2Event.metadata,
      read_at: null,
      broadcast_read_at: expect.any(String)
    })
  })
})
