import { test } from '../components'
import { getIdentity, Identity, makeRequest } from '../utils'
import { NotificationScope } from '@notifications/common'

const manageSubscriptionMetadata = {
  signer: 'dcl:account',
  intent: 'dcl:account:manage-subscription'
}

test('DELETE /subscription/opt-outs/:scope/:scopeId', function ({ components }) {
  let identity: Identity
  const scope = NotificationScope.Community
  const scopeId = 'community-123'

  beforeEach(async () => {
    identity = await getIdentity()
  })

  describe('when deleting all opt-outs for the scope', () => {
    beforeEach(async () => {
      await components.db.saveNotificationOptOut({
        address: identity.realAccount.address.toLowerCase(),
        scope,
        scope_id: scopeId,
        created_at: Date.now(),
        updated_at: Date.now()
      })
    })

    it('returns 204', async () => {
      const response = await makeRequest(
        components.localFetch,
        `/subscription/opt-outs/${scope}/${scopeId}`,
        identity,
        {
          method: 'DELETE'
        },
        manageSubscriptionMetadata
      )

      expect(response.status).toBe(204)
    })
  })

  describe('when deleting only opt-outs for the requested scopeId', () => {
    beforeEach(async () => {
      ;[
        {
          address: identity.realAccount.address.toLowerCase(),
          scope,
          scope_id: scopeId,
          created_at: Date.now(),
          updated_at: Date.now()
        },
        {
          address: identity.realAccount.address.toLowerCase(),
          scope,
          scope_id: 'community-456',
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ].forEach((optOut) => components.db.saveNotificationOptOut(optOut))
    })

    it('returns 204', async () => {
      const response = await makeRequest(
        components.localFetch,
        `/subscription/opt-outs/${scope}/${scopeId}`,
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
