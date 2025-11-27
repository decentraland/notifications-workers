import { test } from '../components'
import { getIdentity, Identity, makeRequest } from '../utils'
import { NotificationEntityType } from '@notifications/common'

const manageSubscriptionMetadata = {
  signer: 'dcl:account',
  intent: 'dcl:account:manage-subscription'
}

test('DELETE /subscription/opt-outs/:entity/:entityId', function ({ components }) {
  let identity: Identity
  const entity = NotificationEntityType.Community
  const entityId = 'community-123'

  beforeEach(async () => {
    identity = await getIdentity()
  })

  describe('when deleting all opt-outs for the entity', () => {
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

    it('returns 204', async () => {
      const response = await makeRequest(
        components.localFetch,
        `/subscription/opt-outs/${entity}/${entityId}`,
        identity,
        {
          method: 'DELETE'
        },
        manageSubscriptionMetadata
      )

      expect(response.status).toBe(204)
    })
  })

  describe('when deleting only opt-outs for the requested entityId', () => {
    beforeEach(async () => {
      await components.db.saveNotificationOptOuts([
        {
          address: identity.realAccount.address.toLowerCase(),
          entity,
          entity_id: entityId,
          created_at: Date.now(),
          updated_at: Date.now()
        },
        {
          address: identity.realAccount.address.toLowerCase(),
          entity,
          entity_id: 'community-456',
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ])
    })

    it('returns 204', async () => {
      const response = await makeRequest(
        components.localFetch,
        `/subscription/opt-outs/${entity}/${entityId}`,
        identity,
        {
          method: 'DELETE'
        },
        manageSubscriptionMetadata
      )

      expect(response.status).toBe(204)
    })
  })
})
