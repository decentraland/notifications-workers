import { computeAddress, createUnsafeIdentity } from '@dcl/crypto/dist/crypto'
import { Authenticator } from '@dcl/crypto'
import { NotificationType, SubscriptionDetails } from '@dcl/schemas'
import { getSignedAuthHeaders, type Identity } from '@dcl/test-helpers'
import { IFetchComponent } from '@dcl/core-commons'
import { getPublicKey } from '@noble/secp256k1'
import { hexToBytes } from 'eth-connect'
import { makeId } from '../src/logic/utils'
import { NotificationDb } from '@notifications/common'

export { getAuthHeaders, getIdentity } from '@dcl/test-helpers'
export type { Identity } from '@dcl/test-helpers'

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

export function makeRequest(
  localFetch: IFetchComponent,
  path: string,
  identity: Identity,
  options: any = {},
  metadata: Record<string, any> = {}
) {
  const url = new URL(path, 'http://localhost')

  return localFetch.fetch(path, {
    method: 'GET',
    redirect: 'manual',
    ...options,
    headers: {
      ...getSignedAuthHeaders(options.method || 'GET', url.pathname, metadata, identity)
    }
  })
}

export function randomNotification(address: string | undefined): NotificationDb {
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

export function randomSubscriptionDetails(): SubscriptionDetails {
  const details = {
    ignore_all_email: Math.random() > 0.5,
    ignore_all_in_app: Math.random() > 0.5,
    message_type: {}
  }
  for (const type of Object.values(NotificationType)) {
    details.message_type[type] = {
      email: Math.random() > 0.5,
      in_app: Math.random() > 0.5
    }
  }

  return details as SubscriptionDetails
}

export function randomEmail(): string {
  return `${makeId(8)}@${makeId(8)}.com`
}
