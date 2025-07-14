import { test } from '../components'
import { randomEmail } from '../utils'

test('POST /notifications/email', function ({ components, stubComponents }) {
  let apiKey: string
  let testEmail: string
  let testContent: string
  let testSubject: string
  let testTitle: string
  let testTitleHighlight: string
  let validHeaders: Record<string, string>
  let validBody: Record<string, any>

  beforeEach(async () => {
    apiKey = await components.config.getString('NOTIFICATION_SERVICE_TOKEN')
    testEmail = randomEmail()
    testContent = 'Test content'
    testSubject = 'Test subject'
    testTitle = 'Test title'
    testTitleHighlight = 'Test highlight'

    validHeaders = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }

    validBody = {
      email: testEmail,
      content: testContent,
      subject: testSubject,
      title: testTitle,
      titleHighlight: testTitleHighlight
    }

    // Setup default mocks
    stubComponents.sendGridClient.sendEmail.resolves()
    stubComponents.emailRenderer.renderEmail.resolves({
      to: testEmail,
      subject: testSubject,
      content: '<html>test</html>'
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('when a POST request is made to /notifications/email', () => {
    describe('and all required fields are provided', () => {
      it('should send the email correctly', async () => {
        const response = await components.localFetch.fetch('/notifications/email', {
          method: 'POST',
          headers: validHeaders,
          body: JSON.stringify(validBody)
        })

        expect(response.status).toBe(204)
        expect(stubComponents.sendGridClient.sendEmail.calledOnce).toBeTruthy()
        expect(stubComponents.emailRenderer.renderEmail.calledOnce).toBeTruthy()

        const sendEmailCall = stubComponents.sendGridClient.sendEmail.getCall(0)
        expect(sendEmailCall.args[0]).toMatchObject({
          to: testEmail,
          subject: testSubject,
          content: '<html>test</html>'
        })
        expect(sendEmailCall.args[1]).toMatchObject({
          environment: 'dev',
          email_type: 'notification'
        })

        const renderEmailCall = stubComponents.emailRenderer.renderEmail.getCall(0)
        expect(renderEmailCall.args[0]).toBe('common')
        expect(renderEmailCall.args[1]).toBe(testEmail)
        expect(renderEmailCall.args[2]).toMatchObject({
          content: testContent,
          subject: testSubject,
          title: testTitle,
          titleHighlight: testTitleHighlight
        })
      })
    })

    describe('and optional fields are not provided', () => {
      let bodyWithoutDefaults: { email: string; content: string; subject: string }

      beforeEach(() => {
        bodyWithoutDefaults = {
          email: testEmail,
          content: testContent,
          subject: testSubject
        }
      })

      it('should use default values for title and titleHighlight', async () => {
        const response = await components.localFetch.fetch('/notifications/email', {
          method: 'POST',
          headers: validHeaders,
          body: JSON.stringify(bodyWithoutDefaults)
        })

        expect(response.status).toBe(204)

        const renderEmailCall = stubComponents.emailRenderer.renderEmail.getCall(0)
        expect(renderEmailCall.args[2]).toMatchObject({
          content: testContent,
          subject: testSubject,
          title: 'New',
          titleHighlight: 'Notification'
        })
      })
    })

    describe('and the authorization token is invalid', () => {
      let invalidHeaders: Record<string, string>
      let headersWithoutToken: Record<string, string>

      beforeEach(() => {
        invalidHeaders = {
          Authorization: 'Bearer invalid-token',
          'Content-Type': 'application/json'
        }

        headersWithoutToken = {
          'Content-Type': 'application/json'
        }
      })

      describe('when an invalid token is provided', () => {
        it('should return 401 status', async () => {
          const response = await components.localFetch.fetch('/notifications/email', {
            method: 'POST',
            headers: invalidHeaders,
            body: JSON.stringify(validBody)
          })

          expect(response.status).toBe(401)
        })
      })

      describe('when no token is provided', () => {
        it('should return 401 status', async () => {
          const response = await components.localFetch.fetch('/notifications/email', {
            method: 'POST',
            headers: headersWithoutToken,
            body: JSON.stringify(validBody)
          })

          expect(response.status).toBe(401)
        })
      })
    })

    describe('and the request body is invalid', () => {
      let bodyWithoutEmail: { content: string; subject: string }
      let bodyWithoutContent: { email: string; subject: string }
      let bodyWithoutSubject: { email: string; content: string }

      beforeEach(() => {
        bodyWithoutEmail = {
          content: testContent,
          subject: testSubject
        }

        bodyWithoutContent = {
          email: testEmail,
          subject: testSubject
        }

        bodyWithoutSubject = {
          email: testEmail,
          content: testContent
        }
      })

      describe('when email is missing', () => {
        it('should return 400 status', async () => {
          const response = await components.localFetch.fetch('/notifications/email', {
            method: 'POST',
            headers: validHeaders,
            body: JSON.stringify(bodyWithoutEmail)
          })

          expect(response.status).toBe(400)
        })
      })

      describe('when content is missing', () => {
        it('should return 400 status', async () => {
          const response = await components.localFetch.fetch('/notifications/email', {
            method: 'POST',
            headers: validHeaders,
            body: JSON.stringify(bodyWithoutContent)
          })

          expect(response.status).toBe(400)
        })
      })

      describe('when subject is missing', () => {
        it('should return 400 status', async () => {
          const response = await components.localFetch.fetch('/notifications/email', {
            method: 'POST',
            headers: validHeaders,
            body: JSON.stringify(bodyWithoutSubject)
          })

          expect(response.status).toBe(400)
        })
      })

      describe('when body is not valid JSON', () => {
        it('should return 400 status', async () => {
          const response = await components.localFetch.fetch('/notifications/email', {
            method: 'POST',
            headers: validHeaders,
            body: 'invalid json'
          })

          expect(response.status).toBe(400)
        })
      })
    })

    describe('and the email renderer fails', () => {
      it('should respond with a 500 and the error', async () => {
        stubComponents.emailRenderer.renderEmail.rejects(new Error('Render error'))

        const response = await components.localFetch.fetch('/notifications/email', {
          method: 'POST',
          headers: validHeaders,
          body: JSON.stringify(validBody)
        })

        expect(response.status).toBe(500)
      })
    })

    describe('and the sendGridClient fails', () => {
      it('should respond with a 500 and the error', async () => {
        stubComponents.sendGridClient.sendEmail.rejects(new Error('SendGrid error'))

        const response = await components.localFetch.fetch('/notifications/email', {
          method: 'POST',
          headers: validHeaders,
          body: JSON.stringify(validBody)
        })

        expect(response.status).toBe(500)
      })
    })
  })
})
