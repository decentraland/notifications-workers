import { test } from '../components'
import { getIdentity, Identity, makeRequest, randomSubscriptionDetails } from '../utils'
import { defaultSubscription } from '@notifications/common'
import { SubscriptionDetails } from '@dcl/schemas'

const manageSubscriptionMetadata = {
  signer: 'dcl:account',
  intent: 'dcl:account:manage-subscription'
}

test('GET /subscription', function ({ components }) {
  let identity: Identity
  beforeEach(async () => {
    identity = await getIdentity()
  })

  it('should return the subscription data stored in the db', async () => {
    const subscriptionDetails = randomSubscriptionDetails()
    await components.db.saveSubscriptionDetails(identity.realAccount.address, subscriptionDetails)

    const response = await makeRequest(components.localFetch, `/subscription`, identity, {}, manageSubscriptionMetadata)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      details: subscriptionDetails
    })
  })

  it('should return the subscription data stored in the db merged with unconfirmed email data', async () => {
    await components.db.saveUnconfirmedEmail(identity.realAccount.address, 'some@email.net', 'some-token')

    const subscriptionDetails = randomSubscriptionDetails()
    await components.db.saveSubscriptionDetails(identity.realAccount.address, subscriptionDetails)

    const response = await makeRequest(components.localFetch, '/subscription', identity, {}, manageSubscriptionMetadata)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      details: subscriptionDetails,
      unconfirmedEmail: 'some@email.net'
    })
  })

  it('should return the sanitized subscription data', async () => {
    const subscriptionDetails: SubscriptionDetails = {
      ...defaultSubscription(),
      message_type: {
        bid_accepted: { email: true, in_app: true },
        no_longer_valid_key: { email: true, in_app: true }
      } as any
    }
    await components.db.saveSubscriptionDetails(identity.realAccount.address, subscriptionDetails)

    const response = await makeRequest(components.localFetch, `/subscription`, identity, {}, manageSubscriptionMetadata)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ details: defaultSubscription() })
  })

  it('should return a default subscription when no subscription stored', async () => {
    const response = await makeRequest(components.localFetch, `/subscription`, identity, {}, manageSubscriptionMetadata)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      details: defaultSubscription()
    })
  })
})
