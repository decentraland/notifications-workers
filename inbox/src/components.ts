import { createDotEnvConfigComponent } from '@well-known-components/env-config-provider'
import { createLogComponent } from '@well-known-components/logger'
import { createMetricsComponent, instrumentHttpServerWithMetrics } from '@well-known-components/metrics'
import { AppComponents, GlobalContext } from './types'
import { metricDeclarations } from './metrics'
import { createServerComponent, createStatusCheckComponent } from '@well-known-components/http-server'

// Initialize all the components of the app
export async function initComponents(): Promise<AppComponents> {
  const config = await createDotEnvConfigComponent({ path: ['.env.default', '.env'] })
  const logs = await createLogComponent({})
  const metrics = await createMetricsComponent(metricDeclarations, { config })
  const server = await createServerComponent<GlobalContext>(
    { config, logs },
    {
      cors: {
        maxAge: 36000
      }
    }
  )
  await instrumentHttpServerWithMetrics({ server, metrics, config })

  const statusChecks = await createStatusCheckComponent({ server, config })

  return {
    config,
    logs,
    server,
    statusChecks,
    metrics
  }
}
