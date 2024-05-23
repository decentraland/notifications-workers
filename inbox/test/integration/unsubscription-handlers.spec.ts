import { test } from '../components'
import { getIdentity, Identity, randomSubscriptionDetails } from '../utils'
import { defaultSubscription, signUrl } from '@notifications/common'
import { NotificationType } from '@dcl/schemas'

test('GET /unsubscribe/:address', function ({ components }) {
  let identity: Identity
  let baseUrl: string
  let signingKey: string

  beforeEach(async () => {
    identity = await getIdentity()
    baseUrl = `http://${await components.config.requireString('HTTP_SERVER_HOST')}:${await components.config.requireString('HTTP_SERVER_PORT')}`
    signingKey = await components.config.requireString('SIGNING_KEY')
  })

  it('should unsubscribe the user from all emails and render an html response', async () => {
    const subscriptionDetails = randomSubscriptionDetails()
    subscriptionDetails.ignore_all_email = false
    await components.db.saveSubscriptionDetails(identity.realAccount.address, subscriptionDetails)

    const response = await components.fetch.fetch(
      signUrl(signingKey, `${baseUrl}/unsubscribe/${identity.realAccount.address}`)
    )

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('You have been successfully unsubscribed from all email notifications')

    const unconfirmedEmail = await components.db.findSubscription(identity.realAccount.address)
    expect(unconfirmedEmail).toMatchObject({
      address: identity.realAccount.address.toLowerCase(),
      details: { ...subscriptionDetails, ignore_all_email: true }
    })
  })

  it('should register unsubscription even if there is no DB subscription stored', async () => {
    const response = await components.fetch.fetch(
      signUrl(signingKey, `${baseUrl}/unsubscribe/${identity.realAccount.address}`)
    )

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('You have been successfully unsubscribed from all email notifications')

    const unconfirmedEmail = await components.db.findSubscription(identity.realAccount.address)
    expect(unconfirmedEmail).toMatchObject({
      address: identity.realAccount.address.toLowerCase(),
      details: { ...defaultSubscription(), ignore_all_email: true }
    })
  })
})

test('GET /unsubscribe/:address/:notificationType', function ({ components }) {
  let identity: Identity
  let baseUrl: string
  let signingKey: string

  beforeEach(async () => {
    identity = await getIdentity()
    baseUrl = `http://${await components.config.requireString('HTTP_SERVER_HOST')}:${await components.config.requireString('HTTP_SERVER_PORT')}`
    signingKey = await components.config.requireString('SIGNING_KEY')
  })

  it('should unsubscribe the user from all emails and render an html response', async () => {
    const subscriptionDetails = randomSubscriptionDetails()
    subscriptionDetails.ignore_all_email = false
    subscriptionDetails.message_type[NotificationType.BID_ACCEPTED]['email'] = true
    await components.db.saveSubscriptionDetails(identity.realAccount.address, subscriptionDetails)

    const response = await components.fetch.fetch(
      signUrl(signingKey, `${baseUrl}/unsubscribe/${identity.realAccount.address}/${NotificationType.BID_ACCEPTED}`)
    )

    expect(response.status).toBe(200)
    expect(await response.text()).toContain(
      `You have been successfully unsubscribed from email notifications of type ${NotificationType.BID_ACCEPTED}`
    )

    const unconfirmedEmail = await components.db.findSubscription(identity.realAccount.address)
    expect(unconfirmedEmail).toMatchObject({
      address: identity.realAccount.address.toLowerCase(),
      details: {
        ...subscriptionDetails,
        message_type: {
          ...subscriptionDetails.message_type,
          [NotificationType.BID_ACCEPTED]: {
            ...subscriptionDetails.message_type[NotificationType.BID_ACCEPTED],
            email: false
          }
        }
      }
    })
  })

  it('should register unsubscription even if there is no DB subscription stored', async () => {
    const response = await components.fetch.fetch(
      signUrl(signingKey, `${baseUrl}/unsubscribe/${identity.realAccount.address}/${NotificationType.BID_ACCEPTED}`)
    )

    expect(response.status).toBe(200)
    expect(await response.text()).toContain(
      `You have been successfully unsubscribed from email notifications of type ${NotificationType.BID_ACCEPTED}`
    )

    const subscriptionDetails = defaultSubscription()
    const unconfirmedEmail = await components.db.findSubscription(identity.realAccount.address)
    expect(unconfirmedEmail).toMatchObject({
      address: identity.realAccount.address.toLowerCase(),
      details: {
        ...subscriptionDetails,
        message_type: {
          ...subscriptionDetails.message_type,
          [NotificationType.BID_ACCEPTED]: {
            ...subscriptionDetails.message_type[NotificationType.BID_ACCEPTED],
            email: false
          }
        }
      }
    })
  })

  it('should fail for unknown notification type', async () => {
    await expect(() =>
      components.fetch.fetch(
        signUrl(signingKey, `${baseUrl}/unsubscribe/${identity.realAccount.address}/invalid-notification-type`)
      )
    ).rejects.toThrow('Invalid notification type: invalid-notification-type')
  })
})
