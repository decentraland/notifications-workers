import { createEmailRenderer, IEmailRenderer, InboxTemplates } from '../../../src/adapters/email-renderer'

describe('email rendering tests', () => {
  let renderer: IEmailRenderer

  type TestCaseData = {
    to: string
    context: any
  }

  const testCases: Record<InboxTemplates, TestCaseData> = {
    [InboxTemplates.VALIDATE_EMAIL]: {
      to: 'email@example.com',
      context: {
        validateButtonLink: 'https://decentraland.zone/account/confirm-email/0oekmfzAAJccU2d1el57WQWqJrb3FSuG',
        validateButtonText: 'Click Here to Confirm Your Email'
      }
    },
    [InboxTemplates.VALIDATE_CREDITS_EMAIL]: {
      to: 'email@example.com',
      context: {
        validateButtonLink: 'https://decentraland.zone/account/confirm-email/0oekmfzAAJccU2d1el57WQWqJrb3FSuG',
        validateButtonText: 'Click Here to Confirm Your Email'
      }
    }
  }

  beforeAll(async () => {
    renderer = await createEmailRenderer()
  })

  const cases: [InboxTemplates, TestCaseData][] = Object.keys(testCases).map((type: InboxTemplates) => [
    type,
    testCases[type]
  ])

  test.each(cases)(`rendering %s`, async (type: InboxTemplates, data: TestCaseData) => {
    expect(await renderer.renderEmail(type, data.to, data.context)).toMatchSnapshot()
  })
})
