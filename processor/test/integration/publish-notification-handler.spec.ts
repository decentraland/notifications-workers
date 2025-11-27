import sinon from 'sinon'
import { test } from '../components'
import { getIdentity, Identity } from '../utils'
import { NotificationType } from '@dcl/schemas'
import { randomEmail, randomSubscriptionDetails } from '@notifications/inbox/test/utils'
import { NotificationRecord, NotificationScope } from '@notifications/common'

test('POST /notifications', function ({ components, stubComponents }) {
  let identity: Identity
  let apiKey: string

  beforeEach(async () => {
    identity = await getIdentity()
    apiKey = await components.config.getString('NOTIFICATION_SERVICE_TOKEN')
  })

  async function findNotification(someEventKey: string, type: string, address: string) {
    const result = await components.pg.query(`
                SELECT *
                FROM notifications
                WHERE event_key = '${someEventKey}'
                  AND type = '${type}'
                  AND address = '${address.toLowerCase()}'
        `)
    return result.rows[0]
  }

  describe('when request is valid', () => {
    describe('when subscription and email are configured', () => {
      let email: string
      let notification: any
      let renderedEmail: any

      beforeEach(async () => {
        notification = {
          type: NotificationType.WORLDS_ACCESS_RESTORED,
          address: identity.realAccount.address,
          metadata: {
            url: 'https://decentraland.org/builder/worlds?tab=dcl',
            title: 'Worlds available',
            description: 'Access to your Worlds has been restored.',
            world: 'el.dcl.eth',
            permissions: ['streaming'],
            userName: 'Unknown'
          },
          timestamp: Date.now(),
          eventKey: '123'
        }

        const random = randomSubscriptionDetails()
        const customizedSubscriptionDetails = {
          ...random,
          ignore_all_email: false,
          message_type: {
            ...random.message_type,
            [NotificationType.WORLDS_ACCESS_RESTORED]: {
              email: true,
              in_app: true
            }
          }
        }
        email = randomEmail()
        await components.db.saveSubscriptionDetails(identity.realAccount.address, customizedSubscriptionDetails)
        await components.db.saveSubscriptionEmail(identity.realAccount.address, email)

        renderedEmail = {
          to: email,
          subject: 'World Access Restored 🥳',
          content:
            '<p style="font-size: 16px; font-weight: 700; line-height: 24px; text-align: center; color: #43404A;">\nCongratulations! Access to your World(s) has been restored.\n</p>',
          actionButtonText: 'MANAGE WORLDS',
          actionButtonLink: 'https://decentraland.org/builder/worlds?tab=dcl',
          title: 'Hey there',
          titleHighlight: 'Unknown',
          bannerUrl:
            'http://cdn.mcauto-images-production.sendgrid.net/2322095804444b83/c81be6d3-83e7-409c-a04d-e17f297dca61/1200x480.png',
          bannerLabel: 'World access Restored'
        }

        stubComponents.emailRenderer.renderEmail.withArgs(email, sinon.match(notification)).resolves(renderedEmail)
        stubComponents.sendGridClient.sendEmail.withArgs(renderedEmail).resolves()
        await stubComponents.profiles.getByAddress.withArgs(identity.realAccount.address).resolves({
          avatars: [{ name: 'Unknown' }]
        })
      })

      it('persists the notification and sends the email', async () => {
        const { localFetch } = components

        const response = await localFetch.fetch('/notifications', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify([notification])
        })

        const foundNotification = (
          await components.db.findNotifications([notification.address], true, notification.timestamp - 1000, 10)
        )[0]

        await new Promise((resolve) => setImmediate(resolve))

        expect(response.status).toEqual(204)
        expect(foundNotification).toBeDefined()
        expect(foundNotification.metadata).toEqual(notification.metadata)
        expect(foundNotification.read_at).toBeNull()
        expect(foundNotification.timestamp).toEqual(`${notification.timestamp}`)
        expect(
          stubComponents.emailRenderer.renderEmail.calledWith(email, { ...notification, id: foundNotification.id })
        ).toBeTruthy()
        expect(stubComponents.sendGridClient.sendEmail.calledWith(renderedEmail)).toBeTruthy()
      })
    })
  })

  describe('when request is invalid', () => {
    describe('when metadata is missing', () => {
      let notification: NotificationRecord

      beforeEach(async () => {
        notification = {
          type: NotificationType.BID_RECEIVED,
          eventKey: 'some-event-key',
          address: identity.realAccount.address,
          wrongMetadata: {
            test: `This is a test at ${new Date().toISOString()}`
          },
          timestamp: Date.now()
        } as unknown as NotificationRecord
      })

      it('should return 400', async () => {
        const { localFetch } = components

        const response = await localFetch.fetch('/notifications', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify([notification])
        })

        const responseBody = await response.json()
        const foundNotification = await findNotification(notification.eventKey, notification.type, notification.address)

        expect(response.status).toEqual(400)
        expect(responseBody).toMatchObject({ error: 'Bad request', message: '"[0].metadata" is required' })
        expect(foundNotification).toBeUndefined()
      })
    })

    describe('when notification type is invalid', () => {
      let notification: NotificationRecord

      beforeEach(() => {
        notification = {
          type: 'test',
          eventKey: 'some-event-key',
          address: identity.realAccount.address,
          wrongMetadata: {
            test: `This is a test at ${new Date().toISOString()}`
          },
          timestamp: Date.now()
        } as unknown as NotificationRecord
      })

      it('should return 400', async () => {
        const { localFetch } = components

        const response = await localFetch.fetch('/notifications', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify([notification])
        })

        const responseBody = await response.json()
        const foundNotification = await findNotification(notification.eventKey, notification.type, notification.address)

        expect(response.status).toEqual(400)
        expect(responseBody).toMatchObject({
          error: 'Bad request',
          message: 'Invalid notification type: test'
        })
        expect(foundNotification).toBeUndefined()
      })
    })

    describe('when api key is missing', () => {
      it('should return 401', async () => {
        const { localFetch } = components

        const response = await localFetch.fetch('/notifications', {
          method: 'POST',
          body: '{}'
        })

        expect(response.status).toEqual(401)
      })
    })
  })

  describe('when notification opt-outs are in the database', () => {
    describe('when notification matches opt-out', () => {
      const metadataKey = 'communityId'
      const metadataValue = 'test-community'
      const notificationType = NotificationType.COMMUNITY_POST_ADDED
      let notification: any
      beforeEach(async () => {
        await components.db.saveNotificationOptOut({
          address: identity.realAccount.address.toLowerCase(),
          scope: NotificationScope.Community,
          scope_id: metadataValue,
          created_at: Date.now(),
          updated_at: Date.now()
        })

        notification = {
          type: notificationType,
          address: identity.realAccount.address,
          metadata: { [metadataKey]: metadataValue },
          optOutScope: {
            scope: NotificationScope.Community,
            scopeId: metadataValue
          },
          timestamp: Date.now(),
          eventKey: '123'
        }
      })

      it('does not store the notification', async () => {
        const { localFetch } = components
        const response = await localFetch.fetch('/notifications', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify([notification])
        })

        const foundNotification = await findNotification(notification.eventKey, notification.type, notification.address)

        expect(response.status).toEqual(204)
        expect(foundNotification).toBeUndefined()
      })
    })

    describe('when notification does not match opt-out', () => {
      const metadataKey = 'communityId'
      const optOutMetadataValue = 'other-community'
      const notificationMetadataValue = 'test-community'
      const notificationType = NotificationType.COMMUNITY_POST_ADDED
      let notification: any
      beforeEach(async () => {
        await components.db.saveNotificationOptOut({
          address: identity.realAccount.address.toLowerCase(),
          scope: NotificationScope.Community,
          scope_id: optOutMetadataValue,
          created_at: Date.now(),
          updated_at: Date.now()
        })

        notification = {
          type: notificationType,
          address: identity.realAccount.address,
          metadata: { [metadataKey]: notificationMetadataValue },
          optOutScope: {
            scope: NotificationScope.Community,
            scopeId: notificationMetadataValue
          },
          timestamp: Date.now(),
          eventKey: '456'
        }
      })

      it('persists the notification', async () => {
        const { localFetch } = components
        const response = await localFetch.fetch('/notifications', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify([notification])
        })

        const foundNotification = await findNotification(notification.eventKey, notification.type, notification.address)

        expect(response.status).toEqual(204)
        expect(foundNotification).toBeDefined()
        expect(foundNotification.metadata[metadataKey]).toBe(notificationMetadataValue)
      })
    })
  })
})
