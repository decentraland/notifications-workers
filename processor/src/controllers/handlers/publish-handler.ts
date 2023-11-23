import { HandlerContextWithPath } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { InvalidRequestError, NotAuthorizedError } from '@notifications/commons'

export async function parseJson(request: IHttpServerComponent.IRequest) {
  try {
    return await request.json()
  } catch (error: any) {
    throw new InvalidRequestError('Invalid body')
  }
}

export async function sendNotificationsToSqsHandler(
  context: Pick<HandlerContextWithPath<'config' | 'pg', '/notifications'>, 'request' | 'components'>
) {
  const apiKey = await context.components.config.requireString('INTERNAL_API_KEY')
  const authorization = context.request.headers.get('Authorization')

  if (authorization !== `Bearer ${apiKey}`) {
    throw new NotAuthorizedError('Invalid API Key')
  }

  const body = await parseJson(context.request)
  body.source = body.source || 'dcl-internal'

  // TODO: probably we want to validate the payload

  // await context.components.sqs.publish(JSON.stringify({ Message: JSON.stringify(body) }))

  return {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: {}
  }
}
