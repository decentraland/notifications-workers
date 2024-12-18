import { createDotEnvConfigComponent } from '@well-known-components/env-config-provider'
import {
  createServerComponent,
  createStatusCheckComponent,
  instrumentHttpServerWithPromClientRegistry
} from '@well-known-components/http-server'
import { createLogComponent } from '@well-known-components/logger'
import { createMetricsComponent } from '@well-known-components/metrics'
import { createPgComponent } from '@well-known-components/pg-component'
import { metricDeclarations } from './metrics'
import { AppComponents, GlobalContext } from './types'
import path from 'path'
import { createFetchComponent } from '@dcl/platform-server-commons'
import { createEmailRenderer } from './adapters/email-renderer'
import { createSubscriptionsService } from './adapters/subscriptions-service'
import { createDbComponent, createSendGrid, createProfilesComponent } from '@notifications/common'
import { createNotificationsService } from './adapters/notifications-service'
import { createQueueConsumer } from './adapters/queue-consumer'
import { createEventParser } from './logic/event-parser'
import { createMessageProcessor } from './adapters/message-processor'

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

  let databaseUrl: string | undefined = await config.getString('PG_COMPONENT_PSQL_CONNECTION_STRING')
  if (!databaseUrl) {
    const dbUser = await config.requireString('PG_COMPONENT_PSQL_USER')
    const dbDatabaseName = await config.requireString('PG_COMPONENT_PSQL_DATABASE')
    const dbPort = await config.requireString('PG_COMPONENT_PSQL_PORT')
    const dbHost = await config.requireString('PG_COMPONENT_PSQL_HOST')
    const dbPassword = await config.requireString('PG_COMPONENT_PSQL_PASSWORD')
    databaseUrl = `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbDatabaseName}`
  }
  // This worker writes to the database, so it runs the migrations
  const pg = await createPgComponent(
    { logs, config, metrics },
    {
      migration: {
        databaseUrl,
        dir: path.resolve(__dirname, 'migrations'),
        migrationsTable: 'pgmigrations',
        ignorePattern: '.*\\.map',
        direction: 'up'
      }
    }
  )

  const db = createDbComponent({ pg })

  const fetch = await createFetchComponent()

  const subscriptionService = await createSubscriptionsService({ db, logs })
  const emailRenderer = await createEmailRenderer({ config })
  const sendGridClient = await createSendGrid({ config, fetch, logs })

  const profiles = createProfilesComponent({ fetch, config, logs })

  const notificationsService = await createNotificationsService({
    config,
    db,
    emailRenderer,
    logs,
    subscriptionService,
    sendGridClient,
    profiles
  })

  const queueConsumer = await createQueueConsumer({ config })

  const eventParser = createEventParser({ logs })
  const messageProcessor = createMessageProcessor({
    logs,
    queueConsumer,
    notificationsService,
    eventParser
  })

  return {
    config,
    db,
    emailRenderer,
    fetch,
    logs,
    metrics,
    notificationsService,
    pg,
    sendGridClient,
    server,
    statusChecks,
    subscriptionService,
    queueConsumer,
    eventParser,
    messageProcessor,
    profiles
  }
}
