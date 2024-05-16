import { IFetchComponent } from '@well-known-components/interfaces'
import { createConfigComponent } from '@well-known-components/env-config-provider'
import { createLogComponent } from '@well-known-components/logger'
import { createSendGrid, Email } from '../../../src'

describe('sendgrid client tests', () => {
  test('should create client', async () => {
    const logs = await createLogComponent({})
    const config = createConfigComponent({
      SENDGRID_API_URL: 'https://api.sendgrid.com',
      SENDGRID_API_KEY: 'my-key',
      SENDGRID_EMAIL_FROM: 'from@decentrland.org',
      SENDGRID_EMAIL_TEMPLATE_ID: 'my-template-id',
      SENDGRID_SANDBOX_MODE: 'true'
    })
    const fetcher: IFetchComponent = {
      fetch: jest.fn()
    }

    const sendGridClient = await createSendGrid({ config, fetcher, logs })
    expect(sendGridClient).toBeDefined()

    const email: Email = {
      to: 'to@example.com',
      from: 'from@decentrland.org',
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
    await sendGridClient.sendEmail(email)

    expect(fetcher.fetch).toHaveBeenCalledWith('https://api.sendgrid.com/v3/mail/send', {
      body: JSON.stringify({
        personalizations: [
          {
            to: [
              {
                email: 'to@example.com'
              }
            ],
            dynamic_template_data: {
              address: 'to@example.com',
              content: 'This is the content',
              actionButtonLink: 'https://decentraland.org',
              actionButtonText: 'Enter'
            }
          }
        ],
        from: { email: 'from@decentrland.org', name: 'Decentraland' },
        subject: 'This is a subject',
        template_id: 'my-template-id',
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
})
