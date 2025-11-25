import { test } from '../components'
import { getIdentity, Identity, makeRequest } from '../utils'
import { NotificationType } from '@dcl/schemas'

const manageSubscriptionMetadata = {
  signer: 'dcl:account',
  intent: 'dcl:account:manage-subscription'
}

test('POST /subscription/opt-outs', function ({ components }) {
  let identity: Identity

  beforeEach(async () => {
    identity = await getIdentity()
  })

  describe('with valid request', () => {
    describe('with single notification type', () => {
      const metadataKey = 'communityId'
      const metadataValue = 'community-123'
      const notificationTypes = [NotificationType.COMMUNITY_POST_ADDED]

      it('should create a new opt-out', async () => {
        const response = await makeRequest(
          components.localFetch,
          '/subscription/opt-outs',
          identity,
          {
            method: 'POST',
            body: JSON.stringify({
              metadataKey,
              metadataValue,
              notificationTypes
            })
          },
          manageSubscriptionMetadata
        )

        expect(response.status).toBe(201)
        const responseBody = await response.json()
        expect(responseBody).toMatchObject({
          metadataKey,
          metadataValue,
          notificationTypes
        })

        const optOuts = await components.db.findNotificationOptOuts(identity.realAccount.address)
        expect(optOuts).toHaveLength(1)
        expect(optOuts[0]).toMatchObject({
          address: identity.realAccount.address.toLowerCase(),
          metadata_key: metadataKey,
          metadata_value: metadataValue,
          notification_type: NotificationType.COMMUNITY_POST_ADDED
        })
      })
    })

    describe('with multiple notification types', () => {
      const metadataKey = 'communityId'
      const metadataValue = 'community-456'
      const notificationTypes = [NotificationType.COMMUNITY_POST_ADDED, NotificationType.COMMUNITY_INVITE_RECEIVED]

      it('should create multiple opt-out records', async () => {
        const response = await makeRequest(
          components.localFetch,
          '/subscription/opt-outs',
          identity,
          {
            method: 'POST',
            body: JSON.stringify({
              metadataKey,
              metadataValue,
              notificationTypes
            })
          },
          manageSubscriptionMetadata
        )

        expect(response.status).toBe(201)
        const responseBody = await response.json()
        expect(responseBody).toMatchObject({
          metadataKey,
          metadataValue,
          notificationTypes: expect.arrayContaining(notificationTypes)
        })

        const optOuts = await components.db.findNotificationOptOuts(identity.realAccount.address)
        const community456OptOuts = optOuts.filter((o) => o.metadata_value === metadataValue)
        expect(community456OptOuts).toHaveLength(2)
        expect(community456OptOuts.map((o) => o.notification_type)).toEqual(expect.arrayContaining(notificationTypes))
      })
    })

    describe('with multiple different entities', () => {
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
              notificationTypes: [NotificationType.COMMUNITY_POST_ADDED]
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
              notificationTypes: [NotificationType.COMMUNITY_INVITE_RECEIVED]
            })
          },
          manageSubscriptionMetadata
        )

        const optOuts = await components.db.findNotificationOptOuts(identity.realAccount.address)
        expect(optOuts).toHaveLength(2)
      })
    })

    describe('when creating same opt-out twice', () => {
      const body = {
        metadataKey: 'communityId',
        metadataValue: 'community-789',
        notificationTypes: [NotificationType.COMMUNITY_POST_ADDED]
      }

      it('should upsert without error', async () => {
        const response1 = await makeRequest(
          components.localFetch,
          '/subscription/opt-outs',
          identity,
          {
            method: 'POST',
            body: JSON.stringify(body)
          },
          manageSubscriptionMetadata
        )

        expect(response1.status).toBe(201)

        const response2 = await makeRequest(
          components.localFetch,
          '/subscription/opt-outs',
          identity,
          {
            method: 'POST',
            body: JSON.stringify(body)
          },
          manageSubscriptionMetadata
        )

        expect(response2.status).toBe(201)

        const optOuts = await components.db.findNotificationOptOuts(identity.realAccount.address)
        const community789OptOuts = optOuts.filter((o) => o.metadata_value === 'community-789')
        expect(community789OptOuts).toHaveLength(1)
      })
    })
  })

  describe('with invalid request', () => {
    describe('when metadataKey is missing', () => {
      it('should return 400', async () => {
        const response = await makeRequest(
          components.localFetch,
          '/subscription/opt-outs',
          identity,
          {
            method: 'POST',
            body: JSON.stringify({
              metadataValue: 'community-123',
              notificationTypes: [NotificationType.COMMUNITY_POST_ADDED]
            })
          },
          manageSubscriptionMetadata
        )

        expect(response.status).toBe(400)
      })
    })

    describe('when metadataValue is missing', () => {
      it('should return 400', async () => {
        const response = await makeRequest(
          components.localFetch,
          '/subscription/opt-outs',
          identity,
          {
            method: 'POST',
            body: JSON.stringify({
              metadataKey: 'communityId',
              notificationTypes: [NotificationType.COMMUNITY_POST_ADDED]
            })
          },
          manageSubscriptionMetadata
        )

        expect(response.status).toBe(400)
      })
    })

    describe('when notificationTypes is missing', () => {
      it('should return 400', async () => {
        const response = await makeRequest(
          components.localFetch,
          '/subscription/opt-outs',
          identity,
          {
            method: 'POST',
            body: JSON.stringify({
              metadataKey: 'communityId',
              metadataValue: 'community-123'
            })
          },
          manageSubscriptionMetadata
        )

        expect(response.status).toBe(400)
      })
    })

    describe('when notificationTypes is empty array', () => {
      it('should return 400', async () => {
        const response = await makeRequest(
          components.localFetch,
          '/subscription/opt-outs',
          identity,
          {
            method: 'POST',
            body: JSON.stringify({
              metadataKey: 'communityId',
              metadataValue: 'community-123',
              notificationTypes: []
            })
          },
          manageSubscriptionMetadata
        )

        expect(response.status).toBe(400)
      })
    })
  })
})
