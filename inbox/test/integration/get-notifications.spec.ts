import { test } from '../components'
import { getIdentity, Identity, makeRequest, randomNotification } from '../utils'
import { createNotification } from '../db'
import { DbNotification } from '../../src/types'
import * as fetch from 'node-fetch'

test('GET /notifications', function ({ components }) {
  let identity: Identity
  beforeEach(async () => {
    identity = await getIdentity()
  })

  it('should work', async () => {
    const { pg, db } = components

    const notificationEvent = randomNotification(identity.realAccount.address.toLowerCase())
    const notificationId = await createNotification({ pg }, notificationEvent)

    const broadcastNotificationEvent = randomNotification(undefined)
    const broadcastNotificationId = await createNotification({ pg }, broadcastNotificationEvent)

    async function checkResponseForNotifications(
      response: fetch.Response,
      notificationEvent: DbNotification,
      broadcastNotificationEvent: DbNotification,
      read: boolean
    ) {
      expect(response.status).toBe(200)
      const body = await response.json()
      const foundNotification = body.notifications.find((notification: any) => notification.id === notificationId)
      expect(foundNotification).toBeTruthy()
      expect(foundNotification).toMatchObject({
        id: notificationEvent.id,
        address: identity.realAccount.address.toLowerCase(),
        type: notificationEvent.type,
        metadata: notificationEvent.metadata,
        read
      })

      const foundBroadcastNotification = body.notifications.find(
        (notification: any) => notification.id === broadcastNotificationId
      )
      expect(foundBroadcastNotification).toBeTruthy()
      expect(foundBroadcastNotification).toMatchObject({
        id: broadcastNotificationEvent.id,
        address: null,
        type: broadcastNotificationEvent.type,
        metadata: broadcastNotificationEvent.metadata,
        read
      })
    }

    const r1 = await makeRequest(components.localFetch, `/notifications`, identity)
    await checkResponseForNotifications(r1, notificationEvent, broadcastNotificationEvent, false)

    expect(
      await db.markNotificationsAsRead(identity.realAccount.address.toLowerCase(), [
        notificationId,
        broadcastNotificationId
      ])
    ).toBe(2)

    const r2 = await makeRequest(components.localFetch, `/notifications`, identity)
    await checkResponseForNotifications(r2, notificationEvent, broadcastNotificationEvent, true)
  })

  it('should work with onlyUnread filter', async () => {
    const { pg, db } = components

    const n1 = randomNotification(identity.realAccount.address.toLowerCase())
    await createNotification({ pg }, n1)

    const n2 = randomNotification(identity.realAccount.address.toLowerCase())
    await createNotification({ pg }, n2)

    expect(await db.markNotificationsAsRead(identity.realAccount.address.toLowerCase(), [n1.id])).toBe(1)

    const response = await makeRequest(components.localFetch, `/notifications?onlyUnread`, identity)
    expect(response.status).toBe(200)
    const body = await response.json()

    // n1 is read, it should not be returned
    expect(body.notifications.find((notification: any) => notification.id === n1.id)).toBeFalsy()

    // n2 is unread, it should be present in the response
    const foundN2 = body.notifications.find((notification: any) => notification.id === n2.id)
    expect(foundN2).toBeTruthy()
    expect(foundN2).toMatchObject({
      id: n2.id,
      address: identity.realAccount.address.toLowerCase(),
      type: n2.type,
      metadata: n2.metadata,
      read: false
    })
  })

  it('should work with from filter', async () => {
    const { pg } = components

    const n1 = randomNotification(identity.realAccount.address.toLowerCase())
    n1.timestamp = n1.timestamp - 10 * 60 * 60 * 1000
    await createNotification({ pg }, n1)

    const n2 = randomNotification(identity.realAccount.address.toLowerCase())
    await createNotification({ pg }, n2)

    const response = await makeRequest(components.localFetch, `/notifications?from=${n1.timestamp + 1}`, identity)
    expect(response.status).toBe(200)
    const body = await response.json()

    // n1 is too old, it should not be returned
    expect(body.notifications.find((notification: any) => notification.id === n1.id)).toBeFalsy()

    // n2 is more recent, it should be present in the response
    const foundN2 = body.notifications.find((notification: any) => notification.id === n2.id)
    expect(foundN2).toBeTruthy()
    expect(foundN2).toMatchObject({
      id: n2.id,
      address: identity.realAccount.address.toLowerCase(),
      type: n2.type,
      metadata: n2.metadata,
      read: false
    })
  })
})
