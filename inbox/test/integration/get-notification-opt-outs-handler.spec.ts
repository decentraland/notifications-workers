import { test } from '../components'
import { getIdentity, Identity, makeRequest } from '../utils'
import { NotificationScope } from '@notifications/common'

const manageSubscriptionMetadata = {
  signer: 'dcl:account',
  intent: 'dcl:account:manage-subscription'
}

test('GET /subscription/opt-outs/:scope/:scopeId', function ({ components }) {
  let identity: Identity
  const scope = NotificationScope.Community
  const scopeId = 'community-123'

  beforeEach(async () => {
    identity = await getIdentity()
  })

  describe('when no opt-out exists', () => {
    it('indicates optedOut false', async () => {
      const response = await makeRequest(
        components.localFetch,
        `/subscription/opt-outs/${scope}/${scopeId}`,
        identity,
        {},
        manageSubscriptionMetadata
      )
      const responseBody = await response.json()

      expect(response.status).toBe(200)
      expect(responseBody).toEqual({
        scope,
        scopeId,
        optedOut: false
      })
    })
  })

  describe('when an opt-out exists for the scope', () => {
    beforeEach(async () => {
      await components.db.saveNotificationOptOut({
        address: identity.realAccount.address.toLowerCase(),
        scope,
        scope_id: scopeId,
        created_at: Date.now(),
        updated_at: Date.now()
      })
    })

    it('indicates optedOut true', async () => {
      const response = await makeRequest(
        components.localFetch,
        `/subscription/opt-outs/${scope}/${scopeId}`,
        identity,
        {},
        manageSubscriptionMetadata
      )
      const responseBody = await response.json()

      expect(response.status).toBe(200)
      expect(responseBody).toEqual({
        scope,
        scopeId,
        optedOut: true
      })
    })
  })

  describe('when only different scopeId exists', () => {
    beforeEach(async () => {
      await components.db.saveNotificationOptOut({
        address: identity.realAccount.address.toLowerCase(),
        scope,
        scope_id: 'community-456',
        created_at: Date.now(),
        updated_at: Date.now()
      })
    })

    it('indicates optedOut false', async () => {
      const response = await makeRequest(
        components.localFetch,
        `/subscription/opt-outs/${scope}/${scopeId}`,
        identity,
        {},
        manageSubscriptionMetadata
      )
      const responseBody = await response.json()

      expect(response.status).toBe(200)
      expect(responseBody).toEqual({
        scope,
        scopeId,
        optedOut: false
      })
    })
  })

  describe('when other users have opt-outs', () => {
    beforeEach(async () => {
      const otherIdentity = await getIdentity()
      await components.db.saveNotificationOptOut({
        address: otherIdentity.realAccount.address.toLowerCase(),
        scope,
        scope_id: scopeId,
        created_at: Date.now(),
        updated_at: Date.now()
      })
    })

    it('still indicates optedOut false', async () => {
      const response = await makeRequest(
        components.localFetch,
        `/subscription/opt-outs/${scope}/${scopeId}`,
        identity,
        {},
        manageSubscriptionMetadata
      )
      const responseBody = await response.json()

      expect(response.status).toBe(200)
      expect(responseBody).toEqual({
        scope,
        scopeId,
        optedOut: false
      })
    })
  })
})
