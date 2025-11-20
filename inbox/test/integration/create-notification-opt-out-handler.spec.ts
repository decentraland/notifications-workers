import { test } from '../components'
import { getIdentity, Identity, makeRequest } from '../utils'

const manageSubscriptionMetadata = {
  signer: 'dcl:account',
  intent: 'dcl:account:manage-subscription'
}

test('POST /subscription/opt-outs', function ({ components }) {
  let identity: Identity

  beforeEach(async () => {
    identity = await getIdentity()
  })

  it('should create a new opt-out', async () => {
    const response = await makeRequest(
      components.localFetch,
      '/subscription/opt-outs',
      identity,
      {
        method: 'POST',
        body: JSON.stringify({
          metadataKey: 'communityId',
          metadataValue: 'community-123',
          notificationTypes: null
        })
      },
      manageSubscriptionMetadata
    )

    expect(response.status).toBe(201)
    const responseBody = await response.json()
    expect(responseBody).toMatchObject({
      metadataKey: 'communityId',
      metadataValue: 'community-123',
      notificationTypes: null
    })

    const optOuts = await components.db.findNotificationOptOuts(identity.realAccount.address)
    expect(optOuts).toHaveLength(1)
    expect(optOuts[0]).toMatchObject({
      address: identity.realAccount.address.toLowerCase(),
      metadata_key: 'communityId',
      metadata_value: 'community-123',
      notification_types: null
    })
  })

  it('should create opt-out with specific notification types', async () => {
    const response = await makeRequest(
      components.localFetch,
      '/subscription/opt-outs',
      identity,
      {
        method: 'POST',
        body: JSON.stringify({
          metadataKey: 'communityId',
          metadataValue: 'community-456',
          notificationTypes: ['COMMUNITY_POST_ADDED', 'COMMUNITY_INVITE_RECEIVED']
        })
      },
      manageSubscriptionMetadata
    )

    expect(response.status).toBe(201)
    const responseBody = await response.json()
    expect(responseBody).toMatchObject({
      metadataKey: 'communityId',
      metadataValue: 'community-456',
      notificationTypes: ['COMMUNITY_POST_ADDED', 'COMMUNITY_INVITE_RECEIVED']
    })

    const optOuts = await components.db.findNotificationOptOuts(identity.realAccount.address)
    const optOut = optOuts.find((o) => o.metadata_value === 'community-456')
    expect(optOut).toMatchObject({
      notification_types: ['COMMUNITY_POST_ADDED', 'COMMUNITY_INVITE_RECEIVED']
    })
  })

  it('should fail if metadataKey is missing', async () => {
    const response = await makeRequest(
      components.localFetch,
      '/subscription/opt-outs',
      identity,
      {
        method: 'POST',
        body: JSON.stringify({
          metadataValue: 'community-123'
        })
      },
      manageSubscriptionMetadata
    )

    expect(response.status).toBe(400)
  })

  it('should fail if metadataValue is missing', async () => {
    const response = await makeRequest(
      components.localFetch,
      '/subscription/opt-outs',
      identity,
      {
        method: 'POST',
        body: JSON.stringify({
          metadataKey: 'communityId'
        })
      },
      manageSubscriptionMetadata
    )

    expect(response.status).toBe(400)
  })

  it('should allow creating multiple opt-outs for different entities', async () => {
    await makeRequest(
      components.localFetch,
      '/subscription/opt-outs',
      identity,
      {
        method: 'POST',
        body: JSON.stringify({
          metadataKey: 'communityId',
          metadataValue: 'community-123',
          notificationTypes: null
        })
      },
      manageSubscriptionMetadata
    )

    await makeRequest(
      components.localFetch,
      '/subscription/opt-outs',
      identity,
      {
        method: 'POST',
        body: JSON.stringify({
          metadataKey: 'communityId',
          metadataValue: 'community-456',
          notificationTypes: null
        })
      },
      manageSubscriptionMetadata
    )

    const optOuts = await components.db.findNotificationOptOuts(identity.realAccount.address)
    expect(optOuts).toHaveLength(2)
  })
})
