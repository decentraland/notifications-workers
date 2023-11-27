import { createUnsafeIdentity } from '@dcl/crypto/dist/crypto'
import { Authenticator, AuthIdentity, IdentityType } from '@dcl/crypto'
import { AuthChain } from '@dcl/schemas'
import { AUTH_CHAIN_HEADER_PREFIX, AUTH_METADATA_HEADER, AUTH_TIMESTAMP_HEADER } from '@dcl/platform-crypto-middleware'
import { IPgComponent } from '@well-known-components/pg-component'
import { NotificationEvent } from '../src/types'
import { IFetchComponent } from '@well-known-components/interfaces'

export async function cleanup(pg: IPgComponent): Promise<void> {
  await pg.query(`TRUNCATE notifications, cursors`)
}

export type Identity = { authChain: AuthIdentity; realAccount: IdentityType; ephemeralIdentity: IdentityType }

export async function getIdentity(): Promise<Identity> {
  const ephemeralIdentity = createUnsafeIdentity()
  const realAccount = createUnsafeIdentity()

  const authChain = await Authenticator.initializeAuthChain(
    realAccount.address,
    ephemeralIdentity,
    10,
    async (message) => {
      return Authenticator.createSignature(realAccount, message)
    }
  )

  return { authChain, realAccount, ephemeralIdentity }
}

export function getAuthHeaders(
  method: string,
  path: string,
  metadata: Record<string, any>,
  chainProvider: (payload: string) => AuthChain
) {
  const headers: Record<string, string> = {}
  const timestamp = Date.now()
  const metadataJSON = JSON.stringify(metadata)
  const payloadParts = [method.toLowerCase(), path.toLowerCase(), timestamp.toString(), metadataJSON]
  const payloadToSign = payloadParts.join(':').toLowerCase()

  const chain = chainProvider(payloadToSign)

  chain.forEach((link, index) => {
    headers[`${AUTH_CHAIN_HEADER_PREFIX}${index}`] = JSON.stringify(link)
  })

  headers[AUTH_TIMESTAMP_HEADER] = timestamp.toString()
  headers[AUTH_METADATA_HEADER] = metadataJSON

  return headers
}

export function makeRequest(localFetch: IFetchComponent, path: string, identity: Identity, options: any = {}) {
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

export function randomNotification(address: string): NotificationEvent {
  return {
    id: '',
    type: 'test',
    address,
    metadata: {
      test: `This is a test at ${new Date().toISOString()}`
    },
    timestamp: Date.now(),
    read_at: null,
    created_at: new Date(),
    updated_at: new Date()
  }
}
