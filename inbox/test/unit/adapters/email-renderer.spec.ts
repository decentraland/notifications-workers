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
      context: {}
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
