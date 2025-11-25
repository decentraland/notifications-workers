import { test } from '../components'
import { getIdentity, Identity, makeRequest } from '../utils'
import { NotificationOptOutDb } from '@notifications/common'
import { NotificationType } from '@dcl/schemas'

const manageSubscriptionMetadata = {
  signer: 'dcl:account',
  intent: 'dcl:account:manage-subscription'
}

test('DELETE /subscription/opt-outs/:metadataKey/:metadataValue', function ({ components }) {
  let identity: Identity
  const metadataKey = 'communityId'

  beforeEach(async () => {
    identity = await getIdentity()
  })

  describe('when notificationType is not provided', () => {
    describe('with multiple opt-outs for same key-value pair', () => {
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

      it('should delete all opt-outs for key-value pair', async () => {
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

        const remainingOptOuts = await components.db.findNotificationOptOuts(identity.realAccount.address)
        expect(remainingOptOuts).toHaveLength(0)
      })
    })

    describe('with URL-encoded metadata values', () => {
      const metadataValue = 'community-123-abc'
      let optOut: NotificationOptOutDb

      beforeEach(async () => {
        optOut = {
          address: identity.realAccount.address.toLowerCase(),
          metadata_key: metadataKey,
          metadata_value: metadataValue,
          notification_type: NotificationType.COMMUNITY_POST_ADDED,
          created_at: Date.now(),
          updated_at: Date.now()
        }
        await components.db.saveNotificationOptOuts([optOut])
      })

      it('should handle URL-encoded metadata values', async () => {
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
        expect(optOuts).toHaveLength(0)
      })
    })

    describe('with multiple different key-value pairs', () => {
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

      it('should only delete the specific opt-out, not others', async () => {
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
  })

  describe('when notificationType is provided', () => {
    const metadataValue = 'community-456'
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

    it('should delete only the specific notification type', async () => {
      const response = await makeRequest(
        components.localFetch,
        `/subscription/opt-outs/${metadataKey}/${metadataValue}?notificationType=${NotificationType.COMMUNITY_POST_ADDED}`,
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
  })
})
