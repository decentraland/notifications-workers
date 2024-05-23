import { test } from '../components'
import { getIdentity, Identity } from '../utils'
import { NotificationType } from '@dcl/schemas'
import { randomEmail, randomSubscriptionDetails } from '@notifications/inbox/test/utils'

test('POST /notifications', function ({ components, stubComponents }) {
  let identity: Identity
  let apiKey: string

  beforeEach(async () => {
    identity = await getIdentity()
    apiKey = await components.config.getString('INTERNAL_API_KEY')
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

  it('should publish a new notification', async () => {
    const { localFetch } = components

    const notification = {
      type: NotificationType.WORLDS_ACCESS_RESTORED,
      address: identity.realAccount.address,
      metadata: {
        url: 'https://decentraland.org/builder/worlds?tab=dcl',
        title: 'Worlds available',
        description: 'Access to your Worlds has been restored.'
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
    const email = randomEmail()
    await components.db.saveSubscriptionDetails(identity.realAccount.address, customizedSubscriptionDetails)
    await components.db.saveSubscriptionEmail(identity.realAccount.address, email)

    const renderedEmail = {
      to: email,
      subject: 'Access to Your Worlds Has Been Restored',
      content: '<p>Access to your Worlds has been restored.</p>\n',
      actionButtonText: 'Manage Worlds',
      actionButtonLink: 'https://decentraland.org/builder/worlds?tab=dcl'
    }
    stubComponents.emailRenderer.renderEmail.withArgs(email, notification).resolves(renderedEmail)
    stubComponents.sendGridClient.sendEmail.withArgs(renderedEmail).resolves()

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

    expect(stubComponents.emailRenderer.renderEmail.calledWith(email, notification)).toBeTruthy()
    expect(stubComponents.sendGridClient.sendEmail.calledWith(renderedEmail)).toBeTruthy()
  })

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

  it('should be protected by api key', async () => {
    const { localFetch } = components

    const response = await localFetch.fetch('/notifications', {
      method: 'POST',
      body: '{}'
    })

    expect(response.status).toEqual(401)
  })
})
