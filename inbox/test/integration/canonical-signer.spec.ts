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
    // Before 6.0.0 the whole payload was lowercased before signing, so a metadata value differing
    // only in case shared the signature: overwriting the header after signing left the request
    // genuinely authentic while reading differently to any case-sensitive comparison downstream.
    // 6.0.0 signs the metadata bytes verbatim, so this delivery no longer verifies either -- but
    // the refusal must not depend on that, which is what this test pins.
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

    // `rejectIfSigner` refuses a non-canonical `signer` rather than comparing it, and runs before
    // signature verification -- so the refusal is a 400 from the gate, not a 401 from the signature.
    // Under the old strict `!== 'decentraland-kernel-scene'` check the re-cased value read as a
    // different signer entirely and the scene request was served as a directly user-signed one.
    expect(response.status).toBe(400)
    // The metadata is echoed back truncated at 64 characters, so match the prefix.
    expect(body.error).toMatch(/^Invalid metadata content: /)
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
