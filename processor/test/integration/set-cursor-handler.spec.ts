import { test } from '../components'
import SQL from 'sql-template-strings'
import { makeid } from '../utils'

test('POST /producers/:producer/set-since', function ({ components, stubComponents }) {
  beforeEach(async () => {
    const { config } = stubComponents
    config.requireString.withArgs('INTERNAL_API_KEY').resolves('some-api-key')
  })

  async function findCursor(cursorName: string) {
    const result = await components.pg.query(
      `SELECT *
         FROM cursors
         WHERE id = '${cursorName}'`
    )
    return result.rows[0]
  }

  async function createCursor(cursorName: string) {
    await components.pg.query(
      SQL`INSERT INTO cursors (id, last_successful_run_at, created_at, updated_at)
            VALUES (${cursorName}, ${new Date()}, ${new Date()}, ${new Date()})`
    )
  }

  // it('should change a new notification', async () => {
  //   const { pg, db, localFetch } = components
  //
  //   const response = await localFetch.fetch('/notifications', {
  //     method: 'POST',
  //     headers: {
  //       Authorization: `Bearer some-api-key`
  //     },
  //     body: JSON.stringify(notification)
  //   })
  //
  //   expect(response.status).toEqual(204)
  //
  //   const found = await findNotification('some-event-key', 'test', identity.realAccount.address)
  //   expect(found).toBeDefined()
  //   expect(found.metadata).toEqual(notification.metadata)
  //   expect(found.read_at).toBeNull()
  //   expect(found.timestamp).toEqual(`${notification.timestamp}`)
  // })

  it('should should work', async () => {
    const { pg, db, localFetch } = components
    const { producerRegistry } = stubComponents

    const cursorName = `cursor-${makeid(10)}`
    await createCursor(cursorName)

    producerRegistry.getProducer.withArgs(cursorName).returns({
      start: () => jest.fn() as any,
      notificationType: jest.fn(),
      setLastSuccessfulRun: jest.fn()
    })

    const response = await localFetch.fetch(`/producers/${cursorName}/set-since`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer some-api-key`
      },
      body: JSON.stringify({ since: new Date().toISOString() })
    })

    expect(response.status).toEqual(204)
  })

  it('should be protected by api key', async () => {
    const { pg, db, localFetch } = components

    const cursorName = `cursor-${makeid(10)}`
    const response = await localFetch.fetch(`/producers/${cursorName}/set-since`, {
      method: 'POST',
      body: '{}'
    })

    expect(response.status).toEqual(401)
  })

  it('should fail if invalid cursor requested', async () => {
    const { pg, db, localFetch } = components
    const { producerRegistry } = stubComponents

    const cursorName = `cursor-${makeid(10)}`
    producerRegistry.getProducer.withArgs(cursorName).throws(`Producer for ${cursorName} not found`)

    const response = await localFetch.fetch(`/producers/${cursorName}/set-since`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer some-api-key`
      },
      body: JSON.stringify({})
    })

    expect(response.status).toEqual(404)
    expect(await response.json()).toMatchObject({
      error: 'Not Found',
      message: `Invalid producer: ${cursorName}`
    })
  })

  it('should fail if no since', async () => {
    const { pg, db, localFetch } = components
    const { producerRegistry } = stubComponents

    const cursorName = `cursor-${makeid(10)}`
    await createCursor(cursorName)

    producerRegistry.getProducer.withArgs(cursorName).returns({
      start: () => jest.fn() as any,
      notificationType: jest.fn(),
      setLastSuccessfulRun: jest.fn()
    })

    const response = await localFetch.fetch(`/producers/${cursorName}/set-since`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer some-api-key`
      },
      body: JSON.stringify({})
    })

    expect(response.status).toEqual(400)
    expect(await response.json()).toMatchObject({
      error: 'Bad request',
      message: "Invalid request: missing 'since'."
    })
  })

  it('should fail if since of wrong type', async () => {
    const { pg, db, localFetch } = components
    const { producerRegistry } = stubComponents

    const cursorName = `cursor-${makeid(10)}`
    await createCursor(cursorName)

    producerRegistry.getProducer.withArgs(cursorName).returns({
      start: () => jest.fn() as any,
      notificationType: jest.fn(),
      setLastSuccessfulRun: jest.fn()
    })

    const response = await localFetch.fetch(`/producers/${cursorName}/set-since`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer some-api-key`
      },
      body: JSON.stringify({ since: 34 })
    })

    expect(response.status).toEqual(400)
    expect(await response.json()).toMatchObject({
      error: 'Bad request',
      message: "Invalid request: invalid value for 'since': 34."
    })
  })

  it('should fail if since of invalid date', async () => {
    const { pg, db, localFetch } = components
    const { producerRegistry } = stubComponents

    const cursorName = `cursor-${makeid(10)}`
    await createCursor(cursorName)

    producerRegistry.getProducer.withArgs(cursorName).returns({
      start: () => jest.fn() as any,
      notificationType: jest.fn(),
      setLastSuccessfulRun: jest.fn()
    })

    const response = await localFetch.fetch(`/producers/${cursorName}/set-since`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer some-api-key`
      },
      body: JSON.stringify({ since: 'invalid-date' })
    })

    expect(response.status).toEqual(400)
    expect(await response.json()).toMatchObject({
      error: 'Bad request',
      message: "Invalid request: invalid value for 'since': invalid-date (not a date)."
    })
  })
})
