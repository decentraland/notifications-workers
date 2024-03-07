import { computeAddress, createUnsafeIdentity } from '@dcl/crypto/dist/crypto'
import { Authenticator, AuthIdentity, IdentityType } from '@dcl/crypto'
import { AuthChain } from '@dcl/schemas'
import { AUTH_CHAIN_HEADER_PREFIX, AUTH_METADATA_HEADER, AUTH_TIMESTAMP_HEADER } from '@dcl/platform-crypto-middleware'
import { DbNotification } from '../src/types'
import { IFetchComponent } from '@well-known-components/interfaces'
import { getPublicKey } from '@noble/secp256k1'
import { hexToBytes } from 'eth-connect'

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

export async function getIdentityFromPrivateKey(privateKey: string): Promise<Identity> {
  const publicKey = getPublicKey(hexToBytes(privateKey)).slice(1)
  const address = computeAddress(publicKey)

  const ephemeralIdentity = createUnsafeIdentity()

  const identity = {
    privateKey: privateKey,
    publicKey: Buffer.from(publicKey).toString('hex'),
    address
  }

  const authChain = await Authenticator.initializeAuthChain(address, ephemeralIdentity, 10, async (message) =>
    Authenticator.createSignature(identity, message)
  )
  return { authChain, realAccount: identity, ephemeralIdentity }
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
  const url = new URL(path, 'http://localhost')

  return localFetch.fetch(path, {
    method: 'GET',
    ...options,
    headers: {
      ...getAuthHeaders(options.method || 'GET', url.pathname, {}, (payload) =>
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

export function randomNotification(address: string | undefined): DbNotification {
  return {
    id: '',
    event_key: 'some-event-key-' + Math.random(),
    type: 'test',
    address: address?.toLowerCase(),
    metadata: {
      test: `This is a test at ${new Date().toISOString()}`
    },
    timestamp: Date.now(),
    created_at: Date.now(),
    updated_at: Date.now()
  }
}
