import * as fs from 'node:fs'
import * as path from 'path'
import handlebars from 'handlebars'
import { Email } from '@notifications/common'

enum TemplatePart {
  SUBJECT = 'subject',
  CONTENT = 'content'
}

export enum InboxTemplates {
  VALIDATE_EMAIL = 'validate-email'
}

export type IEmailRenderer = {
  renderEmail(template: InboxTemplates, to: string, context: any): Promise<Email>
}

function loadTemplates() {
  return Object.values(InboxTemplates).reduce(
    (acc, template) => {
      acc[template] = {
        [TemplatePart.SUBJECT]: handlebars.compile(
          fs.readFileSync(
            path.join(__dirname, `email-templates/${template}.${TemplatePart.SUBJECT}.handlebars`),
            'utf8'
          ),
          {}
        ),
        [TemplatePart.CONTENT]: handlebars.compile(
          fs.readFileSync(
            path.join(__dirname, `email-templates/${template}.${TemplatePart.CONTENT}.handlebars`),
            'utf8'
          ),
          {}
        )
      }
      return acc
    },
    {} as Record<InboxTemplates, Record<TemplatePart, HandlebarsTemplateDelegate>>
  )
}

export async function createEmailRenderer(): Promise<IEmailRenderer> {
  const templates = loadTemplates()

  async function renderEmail(template: InboxTemplates, to: string, context: any): Promise<Email> {
    return {
      to,
      subject: templates[template][TemplatePart.SUBJECT](context),
      content: templates[template][TemplatePart.CONTENT](context)
    }
  }

  return {
    renderEmail
  }
}
