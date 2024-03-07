import { test } from '../components'
import { makeid } from '../utils'
import { INotificationProducer } from '../../src/types'
import { createCursor } from '@notifications/inbox/test/db'

test('POST /producers/:producer/set-since', function ({ components, stubComponents }) {
  let producerMock: INotificationProducer
  let apiKey: string

  beforeEach(async () => {
    producerMock = {
      start: () => jest.fn() as any,
      notificationType: jest.fn(),
      runProducerSinceDate: jest.fn()
    }
    apiKey = await components.config.getString('INTERNAL_API_KEY')
  })

  it('should should work', async () => {
    const { localFetch } = components
    const { producerRegistry } = stubComponents

    const cursorName = `cursor-${makeid(10)}`
    await createCursor(components, cursorName)

    producerRegistry.getProducer.withArgs(cursorName).returns(producerMock)

    const newDate = new Date()
    const response = await localFetch.fetch(`/producers/${cursorName}/set-since`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ since: newDate.toISOString() })
    })

    expect(response.status).toEqual(204)
    expect(producerMock.runProducerSinceDate).toHaveBeenCalledWith(newDate.getTime())
  })

  it('should be protected by api key', async () => {
    const { localFetch } = components

    const cursorName = `cursor-${makeid(10)}`
    const response = await localFetch.fetch(`/producers/${cursorName}/set-since`, {
      method: 'POST',
      body: '{}'
    })

    expect(response.status).toEqual(401)
  })

  it('should fail if invalid cursor requested', async () => {
    const { localFetch } = components
    const { producerRegistry } = stubComponents

    const cursorName = `cursor-${makeid(10)}`
    producerRegistry.getProducer.withArgs(cursorName).throws(`Producer for ${cursorName} not found`)

    const response = await localFetch.fetch(`/producers/${cursorName}/set-since`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
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
    const { localFetch } = components
    const { producerRegistry } = stubComponents

    const cursorName = `cursor-${makeid(10)}`
    await createCursor(components, cursorName)

    producerRegistry.getProducer.withArgs(cursorName).returns(producerMock)

    const response = await localFetch.fetch(`/producers/${cursorName}/set-since`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
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
    const { localFetch } = components
    const { producerRegistry } = stubComponents

    const cursorName = `cursor-${makeid(10)}`
    await createCursor(components, cursorName)

    producerRegistry.getProducer.withArgs(cursorName).returns(producerMock)

    const response = await localFetch.fetch(`/producers/${cursorName}/set-since`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
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
    const { localFetch } = components
    const { producerRegistry } = stubComponents

    const cursorName = `cursor-${makeid(10)}`
    await createCursor(components, cursorName)

    producerRegistry.getProducer.withArgs(cursorName).returns(producerMock)

    const response = await localFetch.fetch(`/producers/${cursorName}/set-since`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
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
