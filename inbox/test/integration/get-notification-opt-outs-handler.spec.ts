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

  it('returns optedOut false when no opt-out exists', async () => {
    const response = await makeRequest(
      components.localFetch,
      `/subscription/opt-outs/${entity}/${entityId}`,
      identity,
      {},
      manageSubscriptionMetadata
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      entity,
      entityId,
      optedOut: false
    })
  })

  it('returns optedOut true when an opt-out exists', async () => {
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
      {},
      manageSubscriptionMetadata
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      entity,
      entityId,
      optedOut: true
    })
  })

  it('returns optedOut false when only different entityId exists', async () => {
    await components.db.saveNotificationOptOuts([
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
      {},
      manageSubscriptionMetadata
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      entity,
      entityId,
      optedOut: false
    })
  })

  it('ignores opt-outs from other users', async () => {
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

    const response = await makeRequest(
      components.localFetch,
      `/subscription/opt-outs/${entity}/${entityId}`,
      identity,
      {},
      manageSubscriptionMetadata
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      entity,
      entityId,
      optedOut: false
    })
  })
})
