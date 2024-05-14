import { test } from '../components'
import { getIdentity, Identity, makeRequest, randomEmail, randomSubscription } from '../utils'
import { defaultSubscription } from '@notifications/common'

test('PUT /set-email', function ({ components }) {
  let identity: Identity

  beforeEach(async () => {
    identity = await getIdentity()
  })

  it('should store the email as an unconfirmed email in the db', async () => {
    const email = randomEmail()

    const response = await makeRequest(components.localFetch, '/set-email', identity, {
      method: 'PUT',
      body: JSON.stringify({
        email
      })
    })

    expect(response.status).toBe(204)

    const unconfirmedEmail = await components.db.findUnconfirmedEmail(identity.realAccount.address)
    expect(unconfirmedEmail).toMatchObject({
      address: identity.realAccount.address.toLowerCase(),
      email,
      code: expect.any(String)
    })

    const subscription = await components.db.findSubscription(identity.realAccount.address)
    expect(subscription.email).toBeUndefined()
    expect(subscription).toMatchObject({
      address: identity.realAccount.address,
      details: defaultSubscription()
    })
  })

  it('should remove the email from the subscription and any unconfirmed emails in the db if email is blank', async () => {
    const subscriptionDetails = randomSubscription()
    subscriptionDetails.ignore_all_email = false
    await components.db.saveSubscription(identity.realAccount.address, subscriptionDetails)
    await components.db.saveSubscriptionEmail(identity.realAccount.address, randomEmail())

    const response = await makeRequest(components.localFetch, '/set-email', identity, {
      method: 'PUT',
      body: JSON.stringify({
        email: ''
      })
    })

    expect(response.status).toBe(204)

    const unconfirmedEmail = await components.db.findUnconfirmedEmail(identity.realAccount.address)
    expect(unconfirmedEmail).toBeUndefined()

    const subscription = await components.db.findSubscription(identity.realAccount.address)
    expect(subscription.email).toBe('')
    expect(subscription).toMatchObject({
      address: identity.realAccount.address.toLowerCase(),
      details: { ...subscriptionDetails, ignore_all_email: true }
    })
  })

  it('should fail if non-signed fetch', async () => {
    const email = randomEmail()

    const response = await components.localFetch.fetch('/set-email', {
      method: 'PUT',
      body: JSON.stringify({
        email
      })
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: 'Invalid Auth Chain',
      message: 'This endpoint requires a signed fetch request. See ADR-44.'
    })
  })

  it('should fail if invalid email', async () => {
    const email = 'invalid-email'

    const response = await makeRequest(components.localFetch, '/set-email', identity, {
      method: 'PUT',
      body: JSON.stringify({
        email
      })
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: 'Bad request', message: 'Invalid email' })
  })
})
