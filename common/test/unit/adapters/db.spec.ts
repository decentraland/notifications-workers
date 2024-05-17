import { createDbComponent, DbComponent, defaultSubscription } from '../../../src'
import { IPgComponent } from '@well-known-components/pg-component'

describe('db client tests', () => {
  let pg: IPgComponent
  let db: DbComponent

  beforeEach(async () => {
    pg = {
      query: jest.fn(),
      start: jest.fn(),
      streamQuery: jest.fn(),
      getPool: jest.fn(),
      stop: jest.fn()
    }

    db = createDbComponent({ pg })
  })

  test('findSubscription returns default subscription when nothing found in db', async () => {
    pg.query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] })
    const address = '0x123'
    const res = await db.findSubscription(address)
    expect(res).toMatchObject({
      address,
      created_at: expect.anything(),
      details: defaultSubscription(),
      email: undefined,
      updated_at: expect.anything()
    })
    expect(pg.query).toHaveBeenCalledTimes(1)
  })

  test('findSubscription returns what is found in the db', async () => {
    const exampleSubscription = {
      address: '0x123',
      email: 'some@example.net',
      details: defaultSubscription(),
      created_at: Date.now(),
      updated_at: Date.now()
    }
    pg.query = jest.fn().mockResolvedValue({
      rowCount: 1,
      rows: [exampleSubscription]
    })

    const address = '0x123'
    const res = await db.findSubscription(address)
    expect(res).toMatchObject(exampleSubscription)
    expect(pg.query).toHaveBeenCalledTimes(1)
  })
})
