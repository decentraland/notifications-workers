import { test } from '../components'
import { getIdentity, Identity, makeRequest, randomEmail, randomSubscription } from '../utils'
import { defaultSubscription } from '@notifications/common'
import { makeid } from '@notifications/processor/test/utils'

test('PUT /set-email', function ({ components }) {
  let identity: Identity

  beforeEach(async () => {
    identity = await getIdentity()
  })

  it('should store the email as an unconfirmed email in the db', async () => {
    const email = randomEmail()

    const response = await makeRequest(components.localFetch, '/set-email', identity, {
      method: 'PUT',
      body: JSON.stringify({
        email
      })
    })

    expect(response.status).toBe(204)

    const unconfirmedEmail = await components.db.findUnconfirmedEmail(identity.realAccount.address)
    expect(unconfirmedEmail).toMatchObject({
      address: identity.realAccount.address.toLowerCase(),
      email,
      code: expect.any(String)
    })

    const subscription = await components.db.findSubscription(identity.realAccount.address)
    expect(subscription.email).toBeUndefined()
    expect(subscription).toMatchObject({
      address: identity.realAccount.address,
      details: defaultSubscription()
    })
  })

  it('should remove the email from the subscription and any unconfirmed emails in the db if email is blank', async () => {
    const subscriptionDetails = randomSubscription()
    subscriptionDetails.ignore_all_email = false
    await components.db.saveSubscription(identity.realAccount.address, subscriptionDetails)
    await components.db.saveSubscriptionEmail(identity.realAccount.address, randomEmail())

    const response = await makeRequest(components.localFetch, '/set-email', identity, {
      method: 'PUT',
      body: JSON.stringify({
        email: ''
      })
    })

    expect(response.status).toBe(204)

    const unconfirmedEmail = await components.db.findUnconfirmedEmail(identity.realAccount.address)
    expect(unconfirmedEmail).toBeUndefined()

    const subscription = await components.db.findSubscription(identity.realAccount.address)
    expect(subscription.email).toBe('')
    expect(subscription).toMatchObject({
      address: identity.realAccount.address.toLowerCase(),
      details: { ...subscriptionDetails, ignore_all_email: true }
    })
  })

  it('should fail if non-signed fetch', async () => {
    const email = randomEmail()

    const response = await components.localFetch.fetch('/set-email', {
      method: 'PUT',
      body: JSON.stringify({
        email
      })
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: 'Invalid Auth Chain',
      message: 'This endpoint requires a signed fetch request. See ADR-44.'
    })
  })

  it('should fail if invalid email', async () => {
    const email = 'invalid-email'

    const response = await makeRequest(components.localFetch, '/set-email', identity, {
      method: 'PUT',
      body: JSON.stringify({
        email
      })
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: 'Bad request', message: 'Invalid email' })
  })
})

test('GET /confirm-email', function ({ components, stubComponents }) {
  let identity: Identity

  beforeEach(async () => {
    identity = await getIdentity()
  })

  it('should confirm email in the DB if the code exists', async () => {
    stubComponents.config.requireString.withArgs('ACCOUNT_BASE_URL').resolves('https://account.com')

    const email = randomEmail()
    const code = makeid(32)
    await components.db.saveUnconfirmedEmail(identity.realAccount.address, email, code)

    const response = await components.localFetch.fetch(
      `/confirm-email?address=${identity.realAccount.address}&code=${code}`,
      {
        redirect: 'manual'
      }
    )

    console.log(response.status, await response.text(), response.headers)
    expect(response.status).toBe(301)

    const redirectUrl = response.headers.get('Location')
    expect(redirectUrl).toBe('https://account.com/')
  })

  it('should fail if no address is provided in the link', async () => {
    const response = await components.localFetch.fetch('/confirm-email')

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: 'Bad request',
      message: 'Missing address'
    })
  })

  it('should fail if no code is provided in the link', async () => {
    const response = await components.localFetch.fetch(`/confirm-email?address=${identity.realAccount.address}`)

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: 'Bad request',
      message: 'Missing code'
    })
  })

  it('should fail if code is incorrect length', async () => {
    const code = makeid(10)
    const response = await components.localFetch.fetch(
      `/confirm-email?address=${identity.realAccount.address}&code=${code}`
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: 'Bad request',
      message: 'Missing code'
    })
  })

  it('should fail if the code does not exist in the DB', async () => {
    const code = makeid(32)
    const response = await components.localFetch.fetch(
      `/confirm-email?address=${identity.realAccount.address}&code=${code}`
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: 'Bad request',
      message: 'No unconfirmed email for this address'
    })
  })

  it('should fail if the code does not match the one in the DB', async () => {
    const email = randomEmail()
    await components.db.saveUnconfirmedEmail(identity.realAccount.address, email, makeid(32))

    const code = makeid(32)
    const response = await components.localFetch.fetch(
      `/confirm-email?address=${identity.realAccount.address}&code=${code}`
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: 'Bad request',
      message: 'Invalid code'
    })
  })
})
