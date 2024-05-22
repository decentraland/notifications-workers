import * as fs from 'node:fs'
import * as path from 'path'
import handlebars from 'handlebars'

export type IPageRenderer = {
  renderPage(template: string, context: any): string
}

function loadTemplates() {
  return fs
    .readdirSync(path.join(__dirname, 'page-templates'), { withFileTypes: true })
    .filter((file) => file.isFile() && file.name.endsWith('.handlebars'))
    .reduce(
      (acc, file) => {
        console.log('file', file, file.parentPath, file.name)
        acc[file.name.replace('.handlebars', '')] = handlebars.compile(
          fs.readFileSync(path.join(file.parentPath, file.name), 'utf8')
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
