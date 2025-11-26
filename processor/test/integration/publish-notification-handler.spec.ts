import sinon from 'sinon'
import { test } from '../components'
import { getIdentity, Identity } from '../utils'
import { NotificationType } from '@dcl/schemas'
import { randomEmail, randomSubscriptionDetails } from '@notifications/inbox/test/utils'
import { NotificationEntity } from '@notifications/common'

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

  describe('with valid request', () => {
    describe('with subscription and email configured', () => {
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

      it('should publish a new notification', async () => {
        const { localFetch } = components

        const response = await localFetch.fetch('/notifications', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify([notification])
        })

        expect(response.status).toEqual(204)

        const found = (
          await components.db.findNotifications([notification.address], true, notification.timestamp - 1000, 10)
        )[0]
        expect(found).toBeDefined()
        expect(found.metadata).toEqual(notification.metadata)
        expect(found.read_at).toBeNull()
        expect(found.timestamp).toEqual(`${notification.timestamp}`)

        await new Promise((resolve) => setImmediate(resolve))

        expect(
          stubComponents.emailRenderer.renderEmail.calledWith(email, { ...notification, id: found.id })
        ).toBeTruthy()
        expect(stubComponents.sendGridClient.sendEmail.calledWith(renderedEmail)).toBeTruthy()
      })
    })
  })

  describe('with invalid request', () => {
    describe('when metadata is missing', () => {
      it('should reject invalid notification body', async () => {
        const { localFetch } = components

        const notification = {
          type: NotificationType.BID_RECEIVED,
          eventKey: 'some-event-key',
          address: identity.realAccount.address,
          wrongMetadata: {
            test: `This is a test at ${new Date().toISOString()}`
          },
          timestamp: Date.now()
        }

        const response = await localFetch.fetch('/notifications', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify([notification])
        })

        expect(response.status).toEqual(400)
        expect(await response.json()).toMatchObject({ error: 'Bad request', message: '"[0].metadata" is required' })
        expect(await findNotification(notification.eventKey, notification.type, notification.address)).toBeUndefined()
      })
    })

    describe('when notification type is invalid', () => {
      it('should reject invalid notification type', async () => {
        const { localFetch } = components

        const notification = {
          type: 'test',
          eventKey: 'some-event-key',
          address: identity.realAccount.address,
          wrongMetadata: {
            test: `This is a test at ${new Date().toISOString()}`
          },
          timestamp: Date.now()
        }

        const response = await localFetch.fetch('/notifications', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify([notification])
        })

        expect(response.status).toEqual(400)
        expect(await response.json()).toMatchObject({
          error: 'Bad request',
          message: 'Invalid notification type: test'
        })
        expect(await findNotification(notification.eventKey, notification.type, notification.address)).toBeUndefined()
      })
    })

    describe('when api key is missing', () => {
      it('should be protected by api key', async () => {
        const { localFetch } = components

        const response = await localFetch.fetch('/notifications', {
          method: 'POST',
          body: '{}'
        })

        expect(response.status).toEqual(401)
      })
    })
  })

  describe('with notification opt-outs', () => {
    describe('when notification matches opt-out', () => {
      const metadataKey = 'communityId'
      const metadataValue = 'test-community'
      const notificationType = NotificationType.COMMUNITY_POST_ADDED
      let notification: any

      beforeEach(async () => {
        await components.db.saveNotificationOptOuts([
          {
            address: identity.realAccount.address.toLowerCase(),
            entity: NotificationEntity.Community,
            entity_id: metadataValue,
            created_at: Date.now(),
            updated_at: Date.now()
          }
        ])

        notification = {
          type: notificationType,
          address: identity.realAccount.address,
          metadata: { [metadataKey]: metadataValue },
          timestamp: Date.now(),
          eventKey: '123'
        }
      })

      it('should not store notification when user has opted out', async () => {
        const { localFetch } = components

        const response = await localFetch.fetch('/notifications', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify([notification])
        })

        expect(response.status).toEqual(204)

        const found = await findNotification(notification.eventKey, notification.type, notification.address)
        expect(found).toBeUndefined()
      })
    })

    describe('when notification does not match opt-out', () => {
      const metadataKey = 'communityId'
      const optOutMetadataValue = 'other-community'
      const notificationMetadataValue = 'test-community'
      const notificationType = NotificationType.COMMUNITY_POST_ADDED
      let notification: any

      beforeEach(async () => {
        await components.db.saveNotificationOptOuts([
          {
            address: identity.realAccount.address.toLowerCase(),
            entity: NotificationEntity.Community,
            entity_id: optOutMetadataValue,
            created_at: Date.now(),
            updated_at: Date.now()
          }
        ])

        notification = {
          type: notificationType,
          address: identity.realAccount.address,
          metadata: { [metadataKey]: notificationMetadataValue },
          timestamp: Date.now(),
          eventKey: '456'
        }
      })

      it('should store notification when user has not opted out', async () => {
        const { localFetch } = components

        const response = await localFetch.fetch('/notifications', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify([notification])
        })

        expect(response.status).toEqual(204)

        const found = await findNotification(notification.eventKey, notification.type, notification.address)
        expect(found).toBeDefined()
        expect(found.metadata[metadataKey]).toBe(notificationMetadataValue)
      })
    })
  })
})
