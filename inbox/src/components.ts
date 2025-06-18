import { createDotEnvConfigComponent } from '@well-known-components/env-config-provider'
import { createLogComponent } from '@well-known-components/logger'
import { createMetricsComponent } from '@well-known-components/metrics'
import { createPgComponent } from '@well-known-components/pg-component'
import { createFetchComponent } from '@well-known-components/fetch-component'
import { createFeaturesComponent } from '@well-known-components/features-component'
import {
  createServerComponent,
  createStatusCheckComponent,
  instrumentHttpServerWithPromClientRegistry
} from '@well-known-components/http-server'

import { AppComponents, GlobalContext } from './types'
import { metricDeclarations } from './metrics'
import {
  createDataWarehouseClient,
  createDbComponent,
  createSendGrid,
  createProfilesComponent
} from '@notifications/common'
import { createEmailRenderer } from './adapters/email-renderer'
import { createPageRenderer } from './adapters/page-renderer'
import { createFeatureFlagsAdapter } from './adapters/feature-flags-adapter'
import { createChallengerAdapter } from './adapters/challenger-adapter'

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
  await instrumentHttpServerWithPromClientRegistry({ server, metrics, config, registry: metrics.registry! })
  const statusChecks = await createStatusCheckComponent({ server, config })

  // This worker writes to the database, so it runs the migrations
  const pg = await createPgComponent({ logs, config, metrics })

  const db = createDbComponent({ pg })

  const fetch = createFetchComponent()

  const pageRenderer = await createPageRenderer()
  const emailRenderer = await createEmailRenderer()

  const dataWarehouseClient = await createDataWarehouseClient({ config, fetch, logs })
  const sendGridClient = await createSendGrid({ config, fetch, logs })

  const profiles = await createProfilesComponent({ fetch, config, logs })

  const features = await createFeaturesComponent(
    {
      config,
      logs,
      fetch
    },
    await config.requireString('SERVICE_BASE_URL')
  )

  const featureFlagsAdapter = await createFeatureFlagsAdapter({ logs, features })
  const challengerAdapter = await createChallengerAdapter({ logs, config, fetch, featureFlagsAdapter })

  return {
    config,
    db,
    dataWarehouseClient,
    emailRenderer,
    fetch,
    logs,
    metrics,
    pageRenderer,
    pg,
    profiles,
    sendGridClient,
    server,
    statusChecks,
    features,
    featureFlagsAdapter,
    challengerAdapter
  }
}
