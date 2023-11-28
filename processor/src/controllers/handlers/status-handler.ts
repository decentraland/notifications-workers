import { HandlerContextWithPath } from '../../types'

export async function statusHandler(context: Pick<HandlerContextWithPath<'config', '/status'>, 'url' | 'components'>) {
  const {
    components: { config }
  } = context

  const [commitHash, version] = await Promise.all([
    config.getString('COMMIT_HASH'),
    config.getString('CURRENT_VERSION')
  ])

  return {
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: {
      version: version ?? '',
      currentTime: Date.now(),
      commitHash: commitHash ?? ''
    }
  }
}
