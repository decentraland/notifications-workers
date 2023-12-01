import { createDotEnvConfigComponent } from '@well-known-components/env-config-provider'
import { createLogComponent } from '@well-known-components/logger'
import { createMetricsComponent, instrumentHttpServerWithMetrics } from '@well-known-components/metrics'
import { metricDeclarations } from './metrics'
import { createServerComponent, createStatusCheckComponent } from '@well-known-components/http-server'
import { createPgComponent } from '@well-known-components/pg-component'

import { AppComponents, GlobalContext } from './types'
import { createDbComponent } from './adapters/db'
import { createEventsDispatcherComponent } from './adapters/events-dispatcher'
import { createFetchComponent } from '@well-known-components/fetch-component'

// Initialize all the components of the app
export async function initComponents(): Promise<AppComponents> {
  const config = await createDotEnvConfigComponent({ path: ['.env.default', '.env'] })
  const logs = await createLogComponent({})
  const metrics = await createMetricsComponent(metricDeclarations, { config })
  const server = await createServerComponent<GlobalContext>(
    { config, logs },
    {
      cors: {
        methods: ['GET', 'HEAD', 'OPTIONS', 'DELETE', 'POST', 'PUT'],
        maxAge: 86400
      }
    }
  )
  await instrumentHttpServerWithMetrics({ server, metrics, config })
  const statusChecks = await createStatusCheckComponent({ server, config })

  // This worker writes to the database, so it runs the migrations
  const pg = await createPgComponent({ logs, config, metrics })

  const db = createDbComponent({ logs, pg })
  const eventsDispatcher = createEventsDispatcherComponent({ db, logs })

  const fetcher = createFetchComponent()

  return {
    config,
    logs,
    server,
    statusChecks,
    metrics,
    pg,
    db,
    eventsDispatcher,
    fetcher
  }
}
