import { test } from '../components'
import { getIdentity, Identity, makeRequest } from '../utils'
import { NotificationOptOutDb } from '@notifications/common'

const manageSubscriptionMetadata = {
  signer: 'dcl:account',
  intent: 'dcl:account:manage-subscription'
}

test('GET /subscription/opt-outs', function ({ components }) {
  let identity: Identity

  beforeEach(async () => {
    identity = await getIdentity()
  })

  it('should return empty array when no opt-outs exist', async () => {
    const response = await makeRequest(
      components.localFetch,
      '/subscription/opt-outs',
      identity,
      {},
      manageSubscriptionMetadata
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual([])
  })

  it('should return all opt-outs for the user', async () => {
    // Create multiple opt-outs
    const optOut1: NotificationOptOutDb = {
      address: identity.realAccount.address.toLowerCase(),
      metadata_key: 'communityId',
      metadata_value: 'community-123',
      notification_types: null,
      created_at: Date.now(),
      updated_at: Date.now()
    }
    const optOut2: NotificationOptOutDb = {
      address: identity.realAccount.address.toLowerCase(),
      metadata_key: 'communityId',
      metadata_value: 'community-456',
      notification_types: ['COMMUNITY_POST_ADDED'],
      created_at: Date.now(),
      updated_at: Date.now()
    }
    await components.db.saveNotificationOptOut(optOut1)
    await components.db.saveNotificationOptOut(optOut2)

    const response = await makeRequest(
      components.localFetch,
      '/subscription/opt-outs',
      identity,
      {},
      manageSubscriptionMetadata
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toHaveLength(2)
    expect(body).toContainEqual({
      metadataKey: 'communityId',
      metadataValue: 'community-123',
      notificationTypes: null
    })
    expect(body).toContainEqual({
      metadataKey: 'communityId',
      metadataValue: 'community-456',
      notificationTypes: ['COMMUNITY_POST_ADDED']
    })
  })

  it('should only return opt-outs for the authenticated user', async () => {
    const anotherIdentity = await getIdentity()

    // Create opt-out for current user
    const optOut1: NotificationOptOutDb = {
      address: identity.realAccount.address.toLowerCase(),
      metadata_key: 'communityId',
      metadata_value: 'community-123',
      notification_types: null,
      created_at: Date.now(),
      updated_at: Date.now()
    }
    // Create opt-out for another user
    const optOut2: NotificationOptOutDb = {
      address: anotherIdentity.realAccount.address.toLowerCase(),
      metadata_key: 'communityId',
      metadata_value: 'community-456',
      notification_types: null,
      created_at: Date.now(),
      updated_at: Date.now()
    }
    await components.db.saveNotificationOptOut(optOut1)
    await components.db.saveNotificationOptOut(optOut2)

    const response = await makeRequest(
      components.localFetch,
      '/subscription/opt-outs',
      identity,
      {},
      manageSubscriptionMetadata
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toHaveLength(1)
    expect(body[0].metadataValue).toBe('community-123')
  })
})
