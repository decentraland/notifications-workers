import { test } from '../components'
import { getIdentity, Identity, makeRequest, randomSubscriptionDetails } from '../utils'

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
})
