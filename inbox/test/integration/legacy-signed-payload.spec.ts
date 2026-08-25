import { Authenticator } from '@dcl/crypto'
import { AUTH_CHAIN_HEADER_PREFIX, AUTH_METADATA_HEADER, AUTH_TIMESTAMP_HEADER } from '@dcl/crypto-middleware'
import { test } from '../components'
import { getIdentity, Identity } from '../utils'

/**
 * Pins that callers still on the pre-6.0.0 payload can mark a notification read.
 *
 * They fold the whole joined string before signing while delivering the metadata header verbatim.
 * Since 6.0.0 the metadata bytes are signed as delivered, so the two disagree for any metadata
 * carrying uppercase.
 *
 * `PUT /notifications/read` is the only route where a caller sends such metadata: decentraland-dapps
 * adds `notificationIds` to it here and nowhere else, and godot-explorer signs the request body as
 * its metadata, which is `{"notificationIds":[…]}` on this route. Without the declared key list the
 * navbar's "mark as read" is a 401 in builder, marketplace, profile, account and godot.
 *
 * `getAuthHeaders` in the shared utils signs the 6.x payload, which is why the suite stayed green
 * while production would not have been. These build the folded payload instead.
 */
const PATH = '/notifications/read'

/** Exactly what decentraland-dapps sends: `notificationIds` is the key that breaks the fold. */
const CALLER_METADATA = {
  notificationIds: ['b7B1e0d2-0000-4000-8000-000000000001'],
  signer: 'dcl:navbar',
  intent: 'dcl:navbar:read-notifications'
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

  /** The route takes its ids from the body, not the metadata. */
  function readRequest(headers: Record<string, string>) {
    return components.localFetch.fetch(PATH, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationIds: CALLER_METADATA.notificationIds })
    })
  }

  describe('and the metadata is delivered as signed', () => {
    let response: Awaited<ReturnType<typeof components.localFetch.fetch>>

    beforeEach(async () => {
      response = await readRequest(legacyHeaders('PUT', PATH, CALLER_METADATA))
    })

    it('should reach the handler rather than be refused by signed-fetch verification', async () => {
      expect(response.status).toBe(200)
    })

    it('should report how many rows it updated', async () => {
      // The ids belong to no one, so nothing is updated — the point is that the handler ran at all.
      await expect(response.json()).resolves.toEqual({ updated: 0 })
    })
  })

  describe('and the delivered metadata re-spells the signer', () => {
    let response: Awaited<ReturnType<typeof components.localFetch.fetch>>

    beforeEach(async () => {
      // Folded, `Signer` signs identically to `signer`, so only the declared-key guard can refuse it.
      // Read as absent, `rejectIfSigner` would wave through metadata that names the signer it exists
      // to refuse.
      response = await readRequest(
        legacyHeaders('PUT', PATH, CALLER_METADATA, respell(CALLER_METADATA, 'signer', 'Signer'))
      )
    })

    it('should be refused rather than read as carrying no signer', async () => {
      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toMatchObject({ message: ADR44_REFUSAL })
    })
  })

  describe('and an undeclared key is delivered re-cased', () => {
    let response: Awaited<ReturnType<typeof components.localFetch.fetch>>

    beforeEach(async () => {
      response = await readRequest(
        legacyHeaders('PUT', PATH, CALLER_METADATA, respell(CALLER_METADATA, 'notificationIds', 'NotificationIds'))
      )
    })

    it('should still be served, since no authorization decision reads it', async () => {
      // States the boundary rather than leaving it implied: no handler here reads `authMetadata` at
      // all -- this one takes the ids from the request body and the address from the recovered
      // signature -- so this key's spelling cannot change an outcome.
      expect(response.status).toBe(200)
    })
  })

  describe('and the request carries the scene signer', () => {
    let response: Awaited<ReturnType<typeof components.localFetch.fetch>>

    beforeEach(async () => {
      response = await readRequest(
        legacyHeaders('PUT', PATH, { ...CALLER_METADATA, signer: 'decentraland-kernel-scene' })
      )
    })

    it('should still be refused, so the fallback has not widened who may call', async () => {
      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toMatchObject({ message: ADR44_REFUSAL })
    })
  })

  describe('and the same payload targets another signed route', () => {
    let response: Awaited<ReturnType<typeof components.localFetch.fetch>>

    beforeEach(async () => {
      // The fallback is scoped to the read route. Every caller of the others sends metadata that
      // folds to itself -- decentraland-dapps an all-lowercase `{ signer, intent }`, godot `{}` --
      // so none of them needs the older format accepted, and it is not.
      response = await components.localFetch.fetch('/notifications', {
        method: 'GET',
        headers: legacyHeaders('GET', '/notifications', CALLER_METADATA)
      })
    })

    it('should respond with 401, so the relaxation has not become service-wide', async () => {
      expect(response.status).toBe(401)
    })
  })
})
