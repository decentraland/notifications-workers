import { createConfigComponent } from '@well-known-components/env-config-provider'
import { Request } from 'node-fetch'
import { SQSComponent } from '../../src/adapters/sqs'
import { sendNotificationsToSqsHandler } from '../../src/controllers/handlers/publish-handler'
import { NotAuthorizedError } from '../../src/types'

const INTERNAL_API_KEY = '123456'

describe('publish handler unit test', () => {
  async function executeHandler(sqs: SQSComponent, headers: Record<string, string>, body: any) {
    const config = createConfigComponent({}, { INTERNAL_API_KEY })
    const request = new Request('', {
      method: 'POST',
      body: JSON.stringify(body),
      headers
    })
    return sendNotificationsToSqsHandler({ components: { config, sqs }, request })
  }

  it('should throw NotAuthorizedError if no authentication is provided', async () => {
    const sqs = {
      poll: jest.fn(),
      deleteMessage: jest.fn(),
      publish: jest.fn()
    }
    expect(executeHandler(sqs, {}, {})).rejects.toThrowError(NotAuthorizedError)
  })

  it('should publish in sqs', async () => {
    const sqs = {
      poll: jest.fn(),
      deleteMessage: jest.fn(),
      publish: jest.fn()
    }

    const body = {
      source: 'dcl',
      sid: 'n1'
    }
    await executeHandler(sqs, { Authorization: `Bearer ${INTERNAL_API_KEY}` }, body)

    expect(sqs.publish).toHaveBeenCalledWith(JSON.stringify({ Message: JSON.stringify(body) }))
  })
})
