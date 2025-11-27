import { test } from '../components'
import { getIdentity, Identity, makeRequest } from '../utils'
import { NotificationEntity } from '@notifications/common'

const manageSubscriptionMetadata = {
  signer: 'dcl:account',
  intent: 'dcl:account:manage-subscription'
}

test('GET /subscription/opt-outs/:entity/:entityId', function ({ components }) {
  let identity: Identity
  const entity = NotificationEntity.Community
  const entityId = 'community-123'

  beforeEach(async () => {
    identity = await getIdentity()
  })

  describe('when no opt-out exists', () => {
    it('indicates optedOut false', async () => {
      const response = await makeRequest(
        components.localFetch,
        `/subscription/opt-outs/${entity}/${entityId}`,
        identity,
        {},
        manageSubscriptionMetadata
      )
      const responseBody = await response.json()

      expect(response.status).toBe(200)
      expect(responseBody).toEqual({
        entity,
        entityId,
        optedOut: false
      })
    })
  })

  describe('when an opt-out exists for the entity', () => {
    beforeEach(async () => {
      await components.db.saveNotificationOptOuts([
        {
          address: identity.realAccount.address.toLowerCase(),
          entity,
          entity_id: entityId,
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ])
    })

    it('indicates optedOut true', async () => {
      const response = await makeRequest(
        components.localFetch,
        `/subscription/opt-outs/${entity}/${entityId}`,
        identity,
        {},
        manageSubscriptionMetadata
      )
      const responseBody = await response.json()

      expect(response.status).toBe(200)
      expect(responseBody).toEqual({
        entity,
        entityId,
        optedOut: true
      })
    })
  })

  describe('when only different entityId exists', () => {
    beforeEach(async () => {
      await components.db.saveNotificationOptOuts([
        {
          address: identity.realAccount.address.toLowerCase(),
          entity,
          entity_id: 'community-456',
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ])
    })

    it('indicates optedOut false', async () => {
      const response = await makeRequest(
        components.localFetch,
        `/subscription/opt-outs/${entity}/${entityId}`,
        identity,
        {},
        manageSubscriptionMetadata
      )
      const responseBody = await response.json()

      expect(response.status).toBe(200)
      expect(responseBody).toEqual({
        entity,
        entityId,
        optedOut: false
      })
    })
  })

  describe('when other users have opt-outs', () => {
    beforeEach(async () => {
      const otherIdentity = await getIdentity()
      await components.db.saveNotificationOptOuts([
        {
          address: otherIdentity.realAccount.address.toLowerCase(),
          entity,
          entity_id: entityId,
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ])
    })

    it('still indicates optedOut false', async () => {
      const response = await makeRequest(
        components.localFetch,
        `/subscription/opt-outs/${entity}/${entityId}`,
        identity,
        {},
        manageSubscriptionMetadata
      )
      const responseBody = await response.json()

      expect(response.status).toBe(200)
      expect(responseBody).toEqual({
        entity,
        entityId,
        optedOut: false
      })
    })
  })
})
