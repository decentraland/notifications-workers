import { test } from '../components'
import { getIdentity, Identity, makeRequest } from '../utils'
import { NotificationOptOutDb } from '@notifications/common'
import { NotificationType } from '@dcl/schemas'

const manageSubscriptionMetadata = {
  signer: 'dcl:account',
  intent: 'dcl:account:manage-subscription'
}

test('GET /subscription/opt-outs', function ({ components }) {
  let identity: Identity

  beforeEach(async () => {
    identity = await getIdentity()
  })

  describe('when no opt-outs exist', () => {
    it('should return empty array', async () => {
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
  })

  describe('when opt-outs exist', () => {
    describe('with multiple opt-outs grouped by metadata key-value', () => {
      let optOuts: NotificationOptOutDb[]

      beforeEach(async () => {
        optOuts = [
          {
            address: identity.realAccount.address.toLowerCase(),
            metadata_key: 'communityId',
            metadata_value: 'community-123',
            notification_type: NotificationType.COMMUNITY_POST_ADDED,
            created_at: Date.now(),
            updated_at: Date.now()
          },
          {
            address: identity.realAccount.address.toLowerCase(),
            metadata_key: 'communityId',
            metadata_value: 'community-123',
            notification_type: NotificationType.COMMUNITY_INVITE_RECEIVED,
            created_at: Date.now(),
            updated_at: Date.now()
          },
          {
            address: identity.realAccount.address.toLowerCase(),
            metadata_key: 'communityId',
            metadata_value: 'community-456',
            notification_type: NotificationType.COMMUNITY_POST_ADDED,
            created_at: Date.now(),
            updated_at: Date.now()
          }
        ]
        await components.db.saveNotificationOptOuts(optOuts)
      })

      it('should return grouped opt-outs by metadata key-value', async () => {
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

        const community123 = body.find((item: any) => item.metadataValue === 'community-123')
        expect(community123).toBeDefined()
        expect(community123.metadataKey).toBe('communityId')
        expect(community123.notificationTypes).toHaveLength(2)
        expect(community123.notificationTypes).toEqual(
          expect.arrayContaining([
            NotificationType.COMMUNITY_POST_ADDED,
            NotificationType.COMMUNITY_INVITE_RECEIVED
          ])
        )

        const community456 = body.find((item: any) => item.metadataValue === 'community-456')
        expect(community456).toBeDefined()
        expect(community456.metadataKey).toBe('communityId')
        expect(community456.notificationTypes).toEqual([NotificationType.COMMUNITY_POST_ADDED])
      })
    })

    describe('with opt-outs from multiple users', () => {
      let anotherIdentity: Identity
      let userOptOut: NotificationOptOutDb
      let otherUserOptOut: NotificationOptOutDb

      beforeEach(async () => {
        anotherIdentity = await getIdentity()
        userOptOut = {
          address: identity.realAccount.address.toLowerCase(),
          metadata_key: 'communityId',
          metadata_value: 'community-123',
          notification_type: NotificationType.COMMUNITY_POST_ADDED,
          created_at: Date.now(),
          updated_at: Date.now()
        }
        otherUserOptOut = {
          address: anotherIdentity.realAccount.address.toLowerCase(),
          metadata_key: 'communityId',
          metadata_value: 'community-456',
          notification_type: NotificationType.COMMUNITY_POST_ADDED,
          created_at: Date.now(),
          updated_at: Date.now()
        }
        await components.db.saveNotificationOptOuts([userOptOut, otherUserOptOut])
      })

      it('should only return opt-outs for the authenticated user', async () => {
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
        expect(body[0].metadataKey).toBe('communityId')
      })
    })
  })
})
