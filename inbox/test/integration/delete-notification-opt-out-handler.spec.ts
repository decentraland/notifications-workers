import { test } from '../components'
import { getIdentity, Identity, makeRequest } from '../utils'
import { NotificationEntity } from '@notifications/common'

const manageSubscriptionMetadata = {
  signer: 'dcl:account',
  intent: 'dcl:account:manage-subscription'
}

test('DELETE /subscription/opt-outs/:entity/:entityId', function ({ components }) {
  let identity: Identity
  const entity = NotificationEntity.Community
  const entityId = 'community-123'

  beforeEach(async () => {
    identity = await getIdentity()
  })

  it('should delete all opt-outs for the entity', async () => {
    await components.db.saveNotificationOptOuts([
      {
        address: identity.realAccount.address.toLowerCase(),
        entity,
        entity_id: entityId,
        created_at: Date.now(),
        updated_at: Date.now()
      }
    ])

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

  it('should only delete opt-outs for the requested entityId', async () => {
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
