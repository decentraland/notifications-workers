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
import { createSubgraphComponent } from '@well-known-components/thegraph-component'
import { createProducerRegistry } from './adapters/producer-registry'
import { itemSoldProducer } from './adapters/producers/item-sold'
import { royaltiesEarnedProducer } from './adapters/producers/royalties-earned'
import { createProducer } from './adapters/create-producer'
import { bidReceivedProducer } from './adapters/producers/bid-received'
import { bidAcceptedProducer } from './adapters/producers/bid-accepted'
import { createFetchComponent } from '@dcl/platform-server-commons'
import { rentalStartedProducer } from './adapters/producers/rental-started'
import { rentalEndedProducer } from './adapters/producers/rental-ended'
import { createEmailRenderer } from './adapters/email-renderer'
import { createSubscriptionsService } from './adapters/subscriptions-service'
import { createDbComponent, createSendGrid } from '@notifications/common'
import { createNotificationsService } from './adapters/notifications-service'
import { createQueueConsumer } from './adapters/queue-consumer'
import { createEventParser } from './logic/event-parser'
import { createWorkflowMigrationChecker } from './logic/workflow-migration-checker'
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

  const notificationsService = await createNotificationsService({
    config,
    db,
    emailRenderer,
    logs,
    subscriptionService,
    sendGridClient
  })
  const marketplaceSubGraphUrl = await config.requireString('MARKETPLACE_SUBGRAPH_URL')
  const marketplaceSubGraph = await createSubgraphComponent({ config, logs, metrics, fetch }, marketplaceSubGraphUrl)

  const l2CollectionsSubGraphUrl = await config.requireString('COLLECTIONS_L2_SUBGRAPH_URL')
  const l2CollectionsSubGraph = await createSubgraphComponent(
    { config, logs, metrics, fetch },
    l2CollectionsSubGraphUrl
  )

  // This is a temporal fix until the subsquids are reindexed with the fixes
  const onlySatsumaL2CollectionsSubGraphUrl = await config.getString('ONLY_SATSUMA_COLLECTIONS_L2_SUBGRAPH_URL')
  const onlySatsumaL2CollectionsSubGraph = await createSubgraphComponent(
    { config, logs, metrics, fetch },
    onlySatsumaL2CollectionsSubGraphUrl || l2CollectionsSubGraphUrl
  )

  const rentalsSubGraphUrl = await config.requireString('RENTALS_SUBGRAPH_URL')
  const rentalsSubGraph = await createSubgraphComponent({ config, logs, metrics, fetch }, rentalsSubGraphUrl)

  const landManagerSubGraphUrl = await config.requireString('LAND_MANAGER_SUBGRAPH_URL')
  const landManagerSubGraph = await createSubgraphComponent({ config, logs, metrics, fetch }, landManagerSubGraphUrl)

  const queueConsumer = await createQueueConsumer({ config })
  const workflowMigrationChecker = createWorkflowMigrationChecker()

  // Create the producer registry and add all the producers
  const producerRegistry = await createProducerRegistry({ logs })
  producerRegistry.addProducer(
    await createProducer(
      { db, logs, notificationsService, workflowMigrationChecker },
      await itemSoldProducer({ config, l2CollectionsSubGraph: onlySatsumaL2CollectionsSubGraph })
    )
  )
  producerRegistry.addProducer(
    await createProducer(
      { db, logs, notificationsService, workflowMigrationChecker },
      await royaltiesEarnedProducer({ config, l2CollectionsSubGraph })
    )
  )
  producerRegistry.addProducer(
    await createProducer(
      { db, logs, notificationsService, workflowMigrationChecker },
      await bidReceivedProducer({ config, l2CollectionsSubGraph })
    )
  )
  producerRegistry.addProducer(
    await createProducer(
      { db, logs, notificationsService, workflowMigrationChecker },
      await bidAcceptedProducer({ config, l2CollectionsSubGraph })
    )
  )
  producerRegistry.addProducer(
    await createProducer(
      { db, logs, notificationsService, workflowMigrationChecker },
      await rentalStartedProducer({ config, landManagerSubGraph, rentalsSubGraph })
    )
  )
  producerRegistry.addProducer(
    await createProducer(
      { db, logs, notificationsService, workflowMigrationChecker },
      await rentalEndedProducer({ config, landManagerSubGraph, rentalsSubGraph })
    )
  )

  const eventParser = createEventParser({ logs })
  const messageProcessor = createMessageProcessor({
    logs,
    queueConsumer,
    notificationsService,
    eventParser,
    workflowMigrationChecker
  })

  return {
    config,
    db,
    emailRenderer,
    fetch,
    l2CollectionsSubGraph,
    landManagerSubGraph,
    logs,
    marketplaceSubGraph,
    metrics,
    notificationsService,
    pg,
    producerRegistry,
    rentalsSubGraph,
    sendGridClient,
    server,
    statusChecks,
    subscriptionService,
    queueConsumer,
    eventParser,
    messageProcessor,
    workflowMigrationChecker
  }
}
