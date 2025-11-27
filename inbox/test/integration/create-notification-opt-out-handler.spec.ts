import { test } from '../components'
import { getIdentity, Identity, makeRequest } from '../utils'
import { NotificationScope } from '@notifications/common'

const manageSubscriptionMetadata = {
  signer: 'dcl:account',
  intent: 'dcl:account:manage-subscription'
}

test('POST /subscription/opt-outs', function ({ components }) {
  let identity: Identity

  beforeEach(async () => {
    identity = await getIdentity()
  })

  describe('when request is valid', () => {
    const body = {
      scope: NotificationScope.Community,
      scopeId: 'community-123'
    }

    it('creates a single opt-out row for the scope', async () => {
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
      const responseBody = await response.json()

      expect(response.status).toBe(201)
      expect(responseBody).toEqual({
        scope: body.scope,
        scopeId: body.scopeId,
        optedOut: true
      })
    })
  })

  describe('when request is invalid', () => {
    describe('when body is missing fields', () => {
      it('returns 400', async () => {
        const response = await makeRequest(
          components.localFetch,
          '/subscription/opt-outs',
          identity,
          {
            method: 'POST',
            body: JSON.stringify({ scopeId: 'community-123' })
          },
          manageSubscriptionMetadata
        )

        expect(response.status).toBe(400)
      })
    })

    describe('when scope is unknown', () => {
      it('returns 400', async () => {
        const response = await makeRequest(
          components.localFetch,
          '/subscription/opt-outs',
          identity,
          {
            method: 'POST',
            body: JSON.stringify({
              scope: 'unknown',
              scopeId: 'community-456'
            })
          },
          manageSubscriptionMetadata
        )

        expect(response.status).toBe(400)
      })
    })
  })
})
