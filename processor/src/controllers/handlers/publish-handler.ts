import { InvalidRequestError, HandlerContextWithPath } from '../../types'
import { parseJson } from './utils'

export async function sendNotificationsToSqsHandler(
  context: Pick<HandlerContextWithPath<'logs' | 'config' | 'sqs', '/notifications'>, 'url' | 'request' | 'components'>
) {
  const apiKey = await context.components.config.getString('INTERNAL_API_KEY')
  const authorization = context.request.headers.get('Authorization')

  if (authorization !== `Bearer ${apiKey}`) {
    throw new InvalidRequestError('Invalid API Key')
  }

  const body = await parseJson(context.request)
  body.source = body.source || 'dcl-internal'

  await context.components.sqs.publish(body)

  return {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: {}
  }
}
