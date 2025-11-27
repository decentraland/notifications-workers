import { test } from '../components'
import { getIdentity, Identity, makeRequest } from '../utils'
import { NotificationEntity } from '@notifications/common'

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
    const body = {
      entity: NotificationEntity.Community,
      entityId: 'community-123'
    }

    it('creates a single opt-out row for the entity', async () => {
      const response = await makeRequest(
        components.localFetch,
        '/subscription/opt-outs',
        identity,
        {
          method: 'POST',
          body: JSON.stringify(body)
        },
        manageSubscriptionMetadata
      )

      expect(response.status).toBe(201)
      expect(await response.json()).toEqual({
        entity: body.entity,
        entityId: body.entityId,
        optedOut: true
      })
    })
  })

  describe('with invalid request', () => {
    it('returns 400 when body is missing fields', async () => {
      const response = await makeRequest(
        components.localFetch,
        '/subscription/opt-outs',
        identity,
        {
          method: 'POST',
          body: JSON.stringify({ entityId: 'community-123' })
        },
        manageSubscriptionMetadata
      )
      expect(response.status).toBe(400)
    })

    it('returns 400 when entity is unknown', async () => {
      const response = await makeRequest(
        components.localFetch,
        '/subscription/opt-outs',
        identity,
        {
          method: 'POST',
          body: JSON.stringify({
            entity: 'unknown',
            entityId: 'community-456'
          })
        },
        manageSubscriptionMetadata
      )

      expect(response.status).toBe(400)
    })
  })
})
