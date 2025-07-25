import { HandlerContextWithPath } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { InvalidRequestError, parseJson } from '@dcl/platform-server-commons'
import { Email as Sendable } from '@notifications/common'
import { InboxTemplates } from '../../adapters/email-renderer'

export async function commonEmailHandler(
  context: Pick<
    HandlerContextWithPath<'emailRenderer' | 'sendGridClient' | 'logs' | 'config', '/notifications/email'>,
    'components' | 'request' | 'verification' | 'url'
  >
): Promise<IHttpServerComponent.IResponse> {
  const { emailRenderer, sendGridClient, config } = context.components

  const env = await config.requireString('ENV')

  const body = await parseJson<{
    content: string
    subject: string
    email: string
    title?: string
    titleHighlight?: string
  }>(context.request)

  if (!body.email) {
    throw new InvalidRequestError('Missing email')
  }
  if (!body.content) {
    throw new InvalidRequestError('Missing content')
  }
  if (!body.subject) {
    throw new InvalidRequestError('Missing subject')
  }

  const logger = context.components.logs.getLogger('common-email-handler')

  const email: Sendable = {
    ...(await emailRenderer.renderEmail(InboxTemplates.COMMON, body.email, {
      content: body.content,
      subject: body.subject,
      title: body.title || 'New',
      titleHighlight: body.titleHighlight || 'Notification'
    }))
  }

  logger.info('Sending common email: ', {
    email: JSON.stringify(body.email),
    content: JSON.stringify(body.content),
    subject: JSON.stringify(body.subject)
  })

  await sendGridClient.sendEmail(email, {
    environment: env,
    email_type: 'notification'
  })

  return {
    status: 204,
    body: ''
  }
}
