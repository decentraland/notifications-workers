import { test } from '../components'
import { getIdentity, Identity, makeRequest, randomSubscription } from '../utils'
import { defaultSubscription } from '../../src/logic/subscriptions'

test('GET /subscription', function ({ components }) {
  let identity: Identity
  beforeEach(async () => {
    identity = await getIdentity()
  })

  it('should return the subscription data stored in the db', async () => {
    const subscriptionDetails = randomSubscription()
    await components.db.saveSubscription(identity.realAccount.address, subscriptionDetails)

    const response = await makeRequest(components.localFetch, `/subscription`, identity)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      details: subscriptionDetails
    })
  })

  it('should return a default subscription when no subscription stored', async () => {
    const response = await makeRequest(components.localFetch, `/subscription`, identity)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      details: defaultSubscription()
    })
  })
})