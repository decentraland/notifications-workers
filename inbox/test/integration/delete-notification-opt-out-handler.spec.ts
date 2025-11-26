import { test } from '../components'
import { getIdentity, Identity, makeRequest } from '../utils'
import { NotificationOptOutDb } from '@notifications/common'
import { NotificationType } from '@dcl/schemas'

const manageSubscriptionMetadata = {
  signer: 'dcl:account',
  intent: 'dcl:account:manage-subscription'
}

test('DELETE /subscription/opt-outs/:metadataKey/:metadataValue/:notificationType', function ({ components }) {
  let identity: Identity
  const metadataKey = 'communityId'

  beforeEach(async () => {
    identity = await getIdentity()
  })

  describe('when deleting a notification type', () => {
    const metadataValue = 'community-123'
    let optOuts: NotificationOptOutDb[]

    beforeEach(async () => {
      optOuts = [
        {
          address: identity.realAccount.address.toLowerCase(),
          metadata_key: metadataKey,
          metadata_value: metadataValue,
          notification_type: NotificationType.COMMUNITY_POST_ADDED,
          created_at: Date.now(),
          updated_at: Date.now()
        },
        {
          address: identity.realAccount.address.toLowerCase(),
          metadata_key: metadataKey,
          metadata_value: metadataValue,
          notification_type: NotificationType.COMMUNITY_INVITE_RECEIVED,
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ]
      await components.db.saveNotificationOptOuts(optOuts)
    })

    it('should delete only the requested notification type', async () => {
      const response = await makeRequest(
        components.localFetch,
        `/subscription/opt-outs/${metadataKey}/${metadataValue}/${NotificationType.COMMUNITY_POST_ADDED}`,
        identity,
        {
          method: 'DELETE'
        },
        manageSubscriptionMetadata
      )

      expect(response.status).toBe(204)

      const remainingOptOuts = await components.db.findNotificationOptOuts(identity.realAccount.address)
      expect(remainingOptOuts).toHaveLength(1)
      expect(remainingOptOuts[0].notification_type).toBe(NotificationType.COMMUNITY_INVITE_RECEIVED)
    })

    it('should handle URL-encoded metadata values', async () => {
      const encodedValue = 'community-123-abc'
      await components.db.saveNotificationOptOuts([
        {
          address: identity.realAccount.address.toLowerCase(),
          metadata_key: metadataKey,
          metadata_value: encodedValue,
          notification_type: NotificationType.COMMUNITY_POST_ADDED,
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ])

      const response = await makeRequest(
        components.localFetch,
        `/subscription/opt-outs/${metadataKey}/${encodeURIComponent(encodedValue)}/${NotificationType.COMMUNITY_POST_ADDED}`,
        identity,
        {
          method: 'DELETE'
        },
        manageSubscriptionMetadata
      )

      expect(response.status).toBe(204)

      const optOuts = await components.db.findNotificationOptOuts(identity.realAccount.address)
      expect(optOuts.find((o) => o.metadata_value === encodedValue)).toBeUndefined()
    })
  })

  describe('when multiple metadata values exist', () => {
    beforeEach(async () => {
      await components.db.saveNotificationOptOuts([
        {
          address: identity.realAccount.address.toLowerCase(),
          metadata_key: metadataKey,
          metadata_value: 'community-123',
          notification_type: NotificationType.COMMUNITY_POST_ADDED,
          created_at: Date.now(),
          updated_at: Date.now()
        },
        {
          address: identity.realAccount.address.toLowerCase(),
          metadata_key: metadataKey,
          metadata_value: 'community-456',
          notification_type: NotificationType.COMMUNITY_POST_ADDED,
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ])
    })

    it('should only delete the opt-out for the requested metadata value', async () => {
      const response = await makeRequest(
        components.localFetch,
        `/subscription/opt-outs/${metadataKey}/community-123/${NotificationType.COMMUNITY_POST_ADDED}`,
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
})

test('DELETE /subscription/opt-outs/:metadataKey/:metadataValue', function ({ components }) {
  let identity: Identity
  const metadataKey = 'communityId'

  beforeEach(async () => {
    identity = await getIdentity()
  })

  describe('when deleting all notification types for a metadata pair', () => {
    const metadataValue = 'community-abc'

    beforeEach(async () => {
      await components.db.saveNotificationOptOuts([
        {
          address: identity.realAccount.address.toLowerCase(),
          metadata_key: metadataKey,
          metadata_value: metadataValue,
          notification_type: NotificationType.COMMUNITY_POST_ADDED,
          created_at: Date.now(),
          updated_at: Date.now()
        },
        {
          address: identity.realAccount.address.toLowerCase(),
          metadata_key: metadataKey,
          metadata_value: metadataValue,
          notification_type: NotificationType.COMMUNITY_INVITE_RECEIVED,
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ])
    })

    it('should delete all opt-outs for the metadata pair', async () => {
      const response = await makeRequest(
        components.localFetch,
        `/subscription/opt-outs/${metadataKey}/${metadataValue}`,
        identity,
        {
          method: 'DELETE'
        },
        manageSubscriptionMetadata
      )

      expect(response.status).toBe(204)

      const optOuts = await components.db.findNotificationOptOuts(identity.realAccount.address)
      expect(optOuts.filter((o) => o.metadata_value === metadataValue)).toHaveLength(0)
    })
  })

  describe('when other metadata values exist', () => {
    beforeEach(async () => {
      await components.db.saveNotificationOptOuts([
        {
          address: identity.realAccount.address.toLowerCase(),
          metadata_key: metadataKey,
          metadata_value: 'community-abc',
          notification_type: NotificationType.COMMUNITY_POST_ADDED,
          created_at: Date.now(),
          updated_at: Date.now()
        },
        {
          address: identity.realAccount.address.toLowerCase(),
          metadata_key: metadataKey,
          metadata_value: 'community-def',
          notification_type: NotificationType.COMMUNITY_POST_ADDED,
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ])
    })

    it('should only delete opt-outs for the targeted metadata value', async () => {
      const response = await makeRequest(
        components.localFetch,
        `/subscription/opt-outs/${metadataKey}/community-abc`,
        identity,
        {
          method: 'DELETE'
        },
        manageSubscriptionMetadata
      )

      expect(response.status).toBe(204)

      const optOuts = await components.db.findNotificationOptOuts(identity.realAccount.address)
      expect(optOuts).toHaveLength(1)
      expect(optOuts[0].metadata_value).toBe('community-def')
    })
  })
})
