import { test } from '../components'
import { getIdentity, Identity, makeRequest } from '../utils'
import { NotificationOptOutDb } from '@notifications/common'

const manageSubscriptionMetadata = {
  signer: 'dcl:account',
  intent: 'dcl:account:manage-subscription'
}

test('DELETE /subscription/opt-outs/:metadataKey/:metadataValue', function ({ components }) {
  let identity: Identity

  beforeEach(async () => {
    identity = await getIdentity()
  })

  it('should delete an existing opt-out', async () => {
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

    // Delete it
    const response = await makeRequest(
      components.localFetch,
      '/subscription/opt-outs/communityId/community-123',
      identity,
      {
        method: 'DELETE'
      },
      manageSubscriptionMetadata
    )

    expect(response.status).toBe(204)

    const optOuts = await components.db.findNotificationOptOuts(identity.realAccount.address)
    expect(optOuts).toHaveLength(0)
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
        method: 'DELETE'
      },
      manageSubscriptionMetadata
    )

    expect(response.status).toBe(204)

    const optOuts = await components.db.findNotificationOptOuts(identity.realAccount.address)
    expect(optOuts).toHaveLength(0)
  })

  it('should only delete the specific opt-out, not others', async () => {
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
      notification_types: null,
      created_at: Date.now(),
      updated_at: Date.now()
    }
    await components.db.saveNotificationOptOut(optOut1)
    await components.db.saveNotificationOptOut(optOut2)

    // Delete only one
    const response = await makeRequest(
      components.localFetch,
      '/subscription/opt-outs/communityId/community-123',
      identity,
      {
        method: 'DELETE'
      },
      manageSubscriptionMetadata
    )

    expect(response.status).toBe(204)

    const optOuts = await components.db.findNotificationOptOuts(identity.realAccount.address)
    expect(optOuts).toHaveLength(1)
    expect(optOuts[0].metadata_value).toBe('community-456')
  })
})
