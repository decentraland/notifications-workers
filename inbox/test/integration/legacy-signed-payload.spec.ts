import { Authenticator } from '@dcl/crypto'
import { AUTH_CHAIN_HEADER_PREFIX, AUTH_METADATA_HEADER, AUTH_TIMESTAMP_HEADER } from '@dcl/crypto-middleware'
import { test } from '../components'
import { getIdentity, Identity } from '../utils'

/**
 * Pins that callers still on the pre-6.0.0 payload can reach these routes.
 *
 * They fold the whole joined string before signing while delivering the metadata header verbatim.
 * Since 6.0.0 the metadata bytes are signed as delivered, so the two disagree for any metadata
 * carrying uppercase -- and every current caller sends some. Without the declared key list these are
 * all 401s: decentraland-dapps (builder, marketplace, profile, account) and godot-explorer stop being
 * able to mark a notification read at all.
 *
 * `getAuthHeaders` in the shared utils signs the 6.x payload, which is why the suite stayed green
 * while production would not have been. These build the folded payload instead.
 */
const PATH = '/notifications'

/** What decentraland-dapps sends on a read: `notificationIds` is the key that breaks the fold. */
const CALLER_METADATA = {
  signer: 'dcl:explorer',
  intent: 'dcl:explorer:notifications',
  notificationIds: ['b7B1e0d2-0000-4000-8000-000000000001']
}

/** The body the signed-fetch middleware answers with when it refuses a request itself. */
const ADR44_REFUSAL = 'This endpoint requires a signed fetch request. See ADR-44.'

test('when a caller signs the pre-6.0.0 folded payload', function ({ components }) {
  let identity: Identity

  beforeEach(async () => {
    identity = await getIdentity()
  })

  /**
   * Rewrites one key's spelling while keeping every key in place.
   *
   * Order matters: the folded payload covers the serialized metadata, so moving a key changes the
   * signed bytes and the request fails on the signature instead of on the spelling under test.
   */
  function respell(metadata: Record<string, unknown>, from: string, to: string): Record<string, unknown> {
    return Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key === from ? to : key, value]))
  }

  /** Signs `metadata` folded, then delivers `delivered` (defaulting to the same) verbatim. */
  function legacyHeaders(
    method: string,
    path: string,
    metadata: Record<string, unknown>,
    delivered?: Record<string, unknown>
  ): Record<string, string> {
    const timestamp = Date.now()
    const payload = [method, path, timestamp.toString(), JSON.stringify(metadata)].join(':').toLowerCase()
    const chain = Authenticator.signPayload(
      {
        ephemeralIdentity: identity.ephemeralIdentity,
        expiration: new Date(),
        authChain: identity.authChain.authChain
      },
      payload
    )

    const headers: Record<string, string> = {}
    chain.forEach((link, index) => {
      headers[`${AUTH_CHAIN_HEADER_PREFIX}${index}`] = JSON.stringify(link)
    })
    headers[AUTH_TIMESTAMP_HEADER] = timestamp.toString()
    headers[AUTH_METADATA_HEADER] = JSON.stringify(delivered ?? metadata)

    return headers
  }

  describe('and the metadata is delivered as signed', () => {
    let response: Awaited<ReturnType<typeof components.localFetch.fetch>>

    beforeEach(async () => {
      response = await components.localFetch.fetch(PATH, {
        method: 'GET',
        headers: legacyHeaders('GET', PATH, CALLER_METADATA)
      })
    })

    it('should reach the handler rather than be refused by signed-fetch verification', async () => {
      expect(response.status).toBe(200)
    })

    it('should serve nothing addressed to a different wallet', async () => {
      // Broadcast rows other suites leave behind are visible to every address, so assert only that
      // accepting the older signature did not widen whose feed is returned.
      const body = await response.json()

      for (const notification of body.notifications) {
        expect(notification.address ?? identity.realAccount.address.toLowerCase()).toBe(
          identity.realAccount.address.toLowerCase()
        )
      }
    })
  })

  describe('and the delivered metadata re-spells the signer', () => {
    let response: Awaited<ReturnType<typeof components.localFetch.fetch>>

    beforeEach(async () => {
      // Folded, `Signer` signs identically to `signer`, so only the declared-key guard can refuse it.
      // Read as absent, `rejectIfSigner` would wave through metadata that names the signer it exists
      // to refuse.
      response = await components.localFetch.fetch(PATH, {
        method: 'GET',
        headers: legacyHeaders('GET', PATH, CALLER_METADATA, respell(CALLER_METADATA, 'signer', 'Signer'))
      })
    })

    it('should be refused rather than read as carrying no signer', async () => {
      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toMatchObject({ message: ADR44_REFUSAL })
    })
  })

  describe('and an undeclared key is delivered re-cased', () => {
    let response: Awaited<ReturnType<typeof components.localFetch.fetch>>

    beforeEach(async () => {
      response = await components.localFetch.fetch(PATH, {
        method: 'GET',
        headers: legacyHeaders(
          'GET',
          PATH,
          CALLER_METADATA,
          respell(CALLER_METADATA, 'notificationIds', 'NotificationIds')
        )
      })
    })

    it('should still be served, since no authorization decision reads it', async () => {
      // States the boundary rather than leaving it implied: no handler here reads `authMetadata` at
      // all -- `readNotificationsHandler` takes the ids from the request body and the address from
      // the recovered signature -- so this key's spelling cannot change an outcome.
      expect(response.status).toBe(200)
    })
  })

  describe('and the request carries the scene signer', () => {
    let response: Awaited<ReturnType<typeof components.localFetch.fetch>>

    beforeEach(async () => {
      response = await components.localFetch.fetch(PATH, {
        method: 'GET',
        headers: legacyHeaders('GET', PATH, { ...CALLER_METADATA, signer: 'decentraland-kernel-scene' })
      })
    })

    it('should still be refused, so the fallback has not widened who may call', async () => {
      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toMatchObject({ message: ADR44_REFUSAL })
    })
  })
})
