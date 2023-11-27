import { test } from '../components'
import { getAuthHeaders, getIdentity, Identity } from '../utils'
import { Authenticator } from '@dcl/crypto'

test('GET /notifications', function ({ components }) {
  function makeRequest(path: string, identity: Identity, options: any = {}) {
    const { localFetch } = components
    return localFetch.fetch(path, {
      method: 'GET',
      ...options,
      headers: {
        ...getAuthHeaders(options.method || 'GET', path, {}, (payload) =>
          Authenticator.signPayload(
            {
              ephemeralIdentity: identity.ephemeralIdentity,
              expiration: new Date(),
              authChain: identity.authChain.authChain
            },
            payload
          )
        )
      }
    })
  }

  let identity: Identity
  beforeAll(async () => {
    identity = await getIdentity()
  })

  beforeEach(async () => {
    const { pg } = components
    // await pg.query('TRUNCATE notifications, users_notifications')
  })

  it('should work', async () => {
    const { pg, db } = components

    console.log(identity.realAccount.address)
    const metadata = { test: `test at ${new Date().toISOString()}` }
    await pg.query(`
        INSERT INTO notifications (type, address, metadata)
        VALUES ('test', '${identity.realAccount.address.toLowerCase()}', '${JSON.stringify(metadata)}')
    `)

    const r = await makeRequest(`/notifications`, identity)
    expect(r.status).toEqual(200)
    expect(await r.json()).toMatchObject([
      {
        address: identity.realAccount.address.toLowerCase(),
        type: 'test',
        metadata: {}
      }
    ])
  })
})
