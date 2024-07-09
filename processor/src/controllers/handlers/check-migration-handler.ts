import { HandlerContextWithPath } from '../../types'

export async function checkMigrationHandler(
  context: Pick<HandlerContextWithPath<'workflowMigrationChecker', '/check-migration'>, 'request' | 'components'>
) {
  const { workflowMigrationChecker } = context.components

  const registries = workflowMigrationChecker.getRegistries()

  return {
    status: 200,
    body: {
      registries: Object.fromEntries(registries)
    }
  }
}
