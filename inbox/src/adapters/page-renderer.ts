import * as fs from 'node:fs'
import * as path from 'path'
import handlebars from 'handlebars'

export type IPageRenderer = {
  renderPage(template: string, context: any): string
}

function loadTemplates() {
  const templatesFolder = path.join(__dirname, 'page-templates')
  return fs
    .readdirSync(templatesFolder, { encoding: 'utf8' })
    .filter((file) => file.endsWith('.handlebars'))
    .reduce(
      (acc, file) => {
        acc[file.replace('.handlebars', '')] = handlebars.compile(
          fs.readFileSync(path.join(templatesFolder, file), 'utf8')
        )
        return acc
      },
      {} as Record<string, HandlebarsTemplateDelegate>
    )
}

export async function createPageRenderer(): Promise<IPageRenderer> {
  const templates = loadTemplates()
  function renderPage(template: string, context: any): string {
    return templates[template](context)
  }

  return {
    renderPage
  }
}
