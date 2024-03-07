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
})
