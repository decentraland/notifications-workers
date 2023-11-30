import { HandlerContextWithPath } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { InvalidRequestError, NotAuthorizedError, NotFoundError } from '@notifications/commons'

export async function parseJson(request: IHttpServerComponent.IRequest) {
  try {
    return await request.json()
  } catch (error: any) {
    throw new InvalidRequestError('Invalid body')
  }
}

export async function setCursorHandler(
  context: Pick<
    HandlerContextWithPath<'config' | 'producerRegistry', '/producers/:producer/set-since'>,
    'params' | 'request' | 'components'
  >
) {
  const apiKey = await context.components.config.requireString('INTERNAL_API_KEY')
  const authorization = context.request.headers.get('Authorization')
  if (authorization !== `Bearer ${apiKey}`) {
    throw new NotAuthorizedError('Invalid API Key')
  }

  try {
    context.components.producerRegistry.getProducer(context.params.producer)
  } catch (error: any) {
    throw new NotFoundError(`Invalid producer: ${context.params.producer}`)
  }

  const body = await parseJson(context.request)
  if (!body.since) {
    throw new InvalidRequestError("Invalid request: missing 'since'.")
  }
  if (typeof body.since !== 'string') {
    throw new InvalidRequestError(`Invalid request: invalid value for 'since': ${body.since}.`)
  }

  const sinceDate = new Date(body.since)
  if (sinceDate.toString() === 'Invalid Date') {
    throw new InvalidRequestError(`Invalid request: invalid value for 'since': ${body.since} (not a date).`)
  }

  const producer = context.components.producerRegistry.getProducer(context.params.producer)
  producer.setLastSuccessfulRun(sinceDate)

  return {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: {}
  }
}
