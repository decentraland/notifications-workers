import { Authenticator } from '@dcl/crypto'
import { AUTH_METADATA_HEADER } from '@dcl/crypto-middleware'
import { test } from '../components'
import { getAuthHeaders, getIdentity, Identity, makeRequest } from '../utils'

const SIGNED_METADATA = { signer: 'decentraland-kernel-scene' }
const DELIVERED_METADATA = JSON.stringify({ signer: 'Decentraland-Kernel-Scene' })

test('GET /notifications with a scene signer', function ({ components }) {
  let identity: Identity

  beforeEach(async () => {
    identity = await getIdentity()
  })

  it('should reject a request that signed the canonical signer but delivered a mixed-case spelling', async () => {
    // The canonical payload is lowercased before signing, so a metadata value differing only in
    // case shares the signature. Overwriting the header after signing leaves the request genuinely
    // authentic while reading differently to any case-sensitive comparison downstream. This is the
    // attack, not a mock: nothing here weakens the signature.
    const headers = getAuthHeaders('GET', '/notifications', SIGNED_METADATA, (payload) =>
      Authenticator.signPayload(
        {
          ephemeralIdentity: identity.ephemeralIdentity,
          expiration: new Date(),
          authChain: identity.authChain.authChain
        },
        payload
      )
    )
    headers[AUTH_METADATA_HEADER] = DELIVERED_METADATA

    const response = await components.localFetch.fetch('/notifications', { method: 'GET', headers })
    const body = await response.json()

    // Without this guard the mixed-case spelling fails the strict `!== 'decentraland-kernel-scene'`
    // check in routes.ts, so the scene request is read as a directly user-signed one and served.
    expect(response.status).toBe(400)
    // The raw metadata is echoed back truncated at 64 characters, so match the prefix.
    expect(body.error).toMatch(/^Invalid chain metadata: /)
  })

  it('should reject a request that delivers the canonical signer exactly as signed', async () => {
    const response = await makeRequest(components.localFetch, '/notifications', identity, {}, SIGNED_METADATA)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toMatch(/^Invalid metadata content: /)
  })

  it('should authenticate a request carrying no signer at all', async () => {
    const response = await makeRequest(components.localFetch, '/notifications', identity)
    const body = await response.json()

    // Ordinary user traffic must be untouched by the guard: this gets all the way to the handler,
    // which returns this identity's feed. Broadcast rows other suites left behind are visible to
    // every address, so assert only that nothing addressed to a different wallet is served.
    expect(response.status).toBe(200)
    expect(Array.isArray(body.notifications)).toBe(true)
    for (const notification of body.notifications) {
      expect(notification.address ?? identity.realAccount.address.toLowerCase()).toBe(
        identity.realAccount.address.toLowerCase()
      )
    }
  })
})
