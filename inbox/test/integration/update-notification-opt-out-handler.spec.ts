import { test } from '../components'
import { getIdentity, Identity, makeRequest } from '../utils'
import { NotificationOptOutDb } from '@notifications/common'
import { NotificationType } from '@dcl/schemas'

const manageSubscriptionMetadata = {
  signer: 'dcl:account',
  intent: 'dcl:account:manage-subscription'
}

test('PUT /subscription/opt-outs/:metadataKey/:metadataValue', function ({ components }) {
  let identity: Identity

  beforeEach(async () => {
    identity = await getIdentity()
  })

  it('should update notification types for existing opt-out', async () => {
    // Create opt-out first
    const optOut: NotificationOptOutDb = {
      address: identity.realAccount.address.toLowerCase(),
      metadata_key: 'communityId',
      metadata_value: 'community-123',
      notification_types: null,
      created_at: Date.now(),
      updated_at: Date.now()
    }
    await components.db.saveNotificationOptOut(optOut)

    // Update it
    const response = await makeRequest(
      components.localFetch,
      '/subscription/opt-outs/communityId/community-123',
      identity,
      {
        method: 'PUT',
        body: JSON.stringify({
          notificationTypes: [NotificationType.COMMUNITY_POST_ADDED]
        })
      },
      manageSubscriptionMetadata
    )

    expect(response.status).toBe(200)
    const responseBody = await response.json()
    expect(responseBody).toMatchObject({
      metadataKey: 'communityId',
      metadataValue: 'community-123',
      notificationTypes: [NotificationType.COMMUNITY_POST_ADDED]
    })

    const optOuts = await components.db.findNotificationOptOuts(identity.realAccount.address)
    const updated = optOuts.find((o) => o.metadata_value === 'community-123')
    expect(updated).toMatchObject({
      notification_types: [NotificationType.COMMUNITY_POST_ADDED]
    })
    expect(Number(updated?.updated_at)).toBeGreaterThan(optOut.updated_at)
  })

  it('should fail if opt-out does not exist', async () => {
    const response = await makeRequest(
      components.localFetch,
      '/subscription/opt-outs/communityId/non-existent',
      identity,
      {
        method: 'PUT',
        body: JSON.stringify({
          notificationTypes: [NotificationType.COMMUNITY_POST_ADDED]
        })
      },
      manageSubscriptionMetadata
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.message).toContain('not found')
  })

  it('should handle URL-encoded metadata values', async () => {
    const optOut: NotificationOptOutDb = {
      address: identity.realAccount.address.toLowerCase(),
      metadata_key: 'communityId',
      metadata_value: 'community-123-abc',
      notification_types: null,
      created_at: Date.now(),
      updated_at: Date.now()
    }
    await components.db.saveNotificationOptOut(optOut)

    const response = await makeRequest(
      components.localFetch,
      '/subscription/opt-outs/communityId/community-123-abc',
      identity,
      {
        method: 'PUT',
        body: JSON.stringify({
          notificationTypes: null
        })
      },
      manageSubscriptionMetadata
    )

    expect(response.status).toBe(200)
    const responseBody = await response.json()
    expect(responseBody).toMatchObject({
      metadataKey: 'communityId',
      metadataValue: 'community-123-abc',
      notificationTypes: null
    })
  })
})
