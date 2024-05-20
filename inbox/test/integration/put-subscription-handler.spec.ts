import { test } from '../components'
import { getIdentity, Identity, makeRequest, randomSubscriptionDetails } from '../utils'
import { defaultSubscription } from '@notifications/common'

test('PUT /subscription', function ({ components }) {
  let identity: Identity
  beforeEach(async () => {
    identity = await getIdentity()
  })

  it('should store the received subscription in the db', async () => {
    const subscriptionDetails = randomSubscriptionDetails()

    const response = await makeRequest(components.localFetch, `/subscription`, identity, {
      method: 'PUT',
      body: JSON.stringify(subscriptionDetails)
    })
    expect(response.status).toBe(204)

    const storedSubscription = await components.db.findSubscription(identity.realAccount.address)
    expect(storedSubscription).toMatchObject({
      address: identity.realAccount.address.toLowerCase(),
      details: subscriptionDetails
    })
  })

  it('should fail if missing notification types', async () => {
    const subscriptionDetails = randomSubscriptionDetails()

    const response = await makeRequest(components.localFetch, `/subscription`, identity, {
      method: 'PUT',
      body: JSON.stringify({
        ignore_all_email: false,
        ignore_all_in_app: false,
        message_type: {}
      })
    })
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: 'Bad request',
      message: `Invalid subscription. Missing configuration for the following message types: ${Object.keys(subscriptionDetails.message_type).join(', ')}`
    })
  })

  it('should fail if missing top-level properties', async () => {
    const subscriptionDetails = randomSubscriptionDetails()

    const response = await makeRequest(components.localFetch, `/subscription`, identity, {
      method: 'PUT',
      body: JSON.stringify({})
    })
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: 'Bad request',
      message: `Invalid subscription. Missing required fields: ${Object.keys(subscriptionDetails).join(', ')}`
    })
  })

  it('should fail if invalid values', async () => {
    const subscriptionDetails = randomSubscriptionDetails()

    const response = await makeRequest(components.localFetch, `/subscription`, identity, {
      method: 'PUT',
      body: JSON.stringify({ ...randomSubscriptionDetails(), ignore_all_email: 'invalid' })
    })
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: 'Bad request',
      message: 'Invalid subscription. ignore_all_email must be boolean'
    })
  })
})
