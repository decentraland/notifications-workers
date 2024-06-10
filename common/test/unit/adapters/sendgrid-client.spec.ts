import { IConfigComponent, IFetchComponent, ILoggerComponent } from '@well-known-components/interfaces'
import { createConfigComponent } from '@well-known-components/env-config-provider'
import { createLogComponent } from '@well-known-components/logger'
import { createSendGrid, Email, ISendGridClient } from '../../../src'

describe('sendgrid client tests', () => {
  let logs: ILoggerComponent
  let config: IConfigComponent
  let fetch: IFetchComponent
  let sendGridClient: ISendGridClient

  beforeEach(async () => {
    logs = await createLogComponent({})
    config = createConfigComponent({
      ENV: 'test',
      SENDGRID_API_URL: 'https://api.sendgrid.com',
      SENDGRID_API_KEY: 'my-key',
      SENDGRID_EMAIL_FROM: 'from@decentraland.org',
      SENDGRID_EMAIL_TEMPLATE_ID: 'my-template-id',
      SENDGRID_SANDBOX_MODE: 'true'
    })
    fetch = {
      fetch: jest.fn()
    }

    sendGridClient = await createSendGrid({ config, fetch, logs })
  })

  test('should create client', async () => {
    expect(sendGridClient).toBeDefined()
  })

  test('should send email with all the features', async () => {
    const email: Email = {
      to: 'to@example.com',
      from: 'from@decentraland.org',
      subject: 'This is a subject',
      content: 'This is the content',
      actionButtonLink: 'https://decentraland.org',
      actionButtonText: 'Enter',
      attachments: [
        {
          content:
            'PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImVuIj4KCiAgICA8aGVhZD4KICAgICAgICA8bWV0YSBjaGFyc2V0PSJVVEYtOCI+CiAgICAgICAgPG1ldGEgaHR0cC1lcXVpdj0iWC1VQS1Db21wYXRpYmxlIiBjb250ZW50PSJJRT1lZGdlIj4KICAgICAgICA8bWV0YSBuYW1lPSJ2aWV3cG9ydCIgY29udGVudD0id2lkdGg9ZGV2aWNlLXdpZHRoLCBpbml0aWFsLXNjYWxlPTEuMCI+CiAgICAgICAgPHRpdGxlPkRvY3VtZW50PC90aXRsZT4KICAgIDwvaGVhZD4KCiAgICA8Ym9keT4KCiAgICA8L2JvZHk+Cgo8L2h0bWw+Cg==',
          filename: 'index.html',
          type: 'text/html',
          disposition: 'inline'
        }
      ]
    }

    await sendGridClient.sendEmail(email, {
      environment: 'test',
      tracking_id: '1234'
    })

    expect(fetch.fetch).toHaveBeenCalledWith('https://api.sendgrid.com/v3/mail/send', {
      body: JSON.stringify({
        personalizations: [
          {
            to: [
              {
                email: 'to@example.com'
              }
            ],
            dynamic_template_data: {
              subject: 'This is a subject',
              address: 'to@example.com',
              content: 'This is the content',
              actionButtonLink: 'https://decentraland.org',
              actionButtonText: 'Enter'
            }
          }
        ],
        from: { email: 'from@decentraland.org', name: 'Decentraland' },
        template_id: 'my-template-id',
        custom_args: {
          environment: 'test',
          tracking_id: '1234'
        },
        attachments: email.attachments,
        mail_settings: { sandbox_mode: { enable: true } }
      }),
      headers: {
        Authorization: 'Bearer my-key',
        'Content-Type': 'application/json'
      },
      method: 'POST'
    })
  })

  test('should send email with default from', async () => {
    const email: Email = {
      to: 'to@example.com',
      subject: 'This is a subject',
      content: 'This is the content'
    }
    await sendGridClient.sendEmail(email, {
      environment: 'test'
    })

    expect(fetch.fetch).toHaveBeenCalledWith('https://api.sendgrid.com/v3/mail/send', {
      body: JSON.stringify({
        personalizations: [
          {
            to: [
              {
                email: 'to@example.com'
              }
            ],
            dynamic_template_data: {
              subject: 'This is a subject',
              address: 'to@example.com',
              content: 'This is the content'
            }
          }
        ],
        from: { email: 'from@decentraland.org', name: 'Decentraland' },
        template_id: 'my-template-id',
        custom_args: {
          environment: 'test'
        },
        mail_settings: { sandbox_mode: { enable: true } }
      }),
      headers: {
        Authorization: 'Bearer my-key',
        'Content-Type': 'application/json'
      },
      method: 'POST'
    })
  })
})
