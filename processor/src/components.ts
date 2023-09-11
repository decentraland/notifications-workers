import { createDotEnvConfigComponent } from '@well-known-components/env-config-provider'
import { createServerComponent, createStatusCheckComponent } from '@well-known-components/http-server'
import { createLogComponent } from '@well-known-components/logger'
import { createMetricsComponent, instrumentHttpServerWithMetrics } from '@well-known-components/metrics'
import { createPgComponent } from '@well-known-components/pg-component'
import { AppComponents, GlobalContext } from './types'
import { metricDeclarations } from './metrics'
import { startListenSQS } from './controllers/queue'
import { SQS } from 'aws-sdk'
import { SQSConsumer } from './ports/consumer'

// Initialize all the components of the app
export async function initComponents(): Promise<AppComponents> {
  const config = await createDotEnvConfigComponent({ path: ['.env.default', '.env'] })

  const logs = await createLogComponent({})
  const server = await createServerComponent<GlobalContext>({ config, logs }, {})
  const statusChecks = await createStatusCheckComponent({ server, config })
  const metrics = await createMetricsComponent(metricDeclarations, { config })

  await instrumentHttpServerWithMetrics({ server, metrics, config })

  let databaseUrl: string | undefined = await config.getString('PG_COMPONENT_PSQL_CONNECTION_STRING')

  if (!databaseUrl) {
    const dbUser = await config.requireString('PG_COMPONENT_PSQL_USER')
    const dbDatabaseName = await config.requireString('PG_COMPONENT_PSQL_DATABASE')
    const dbPort = await config.requireString('PG_COMPONENT_PSQL_PORT')
    const dbHost = await config.requireString('PG_COMPONENT_PSQL_HOST')
    const dbPassword = await config.requireString('PG_COMPONENT_PSQL_PASSWORD')
    databaseUrl = `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbDatabaseName}`
  }

  const pg = await createPgComponent({ logs, config, metrics })

  const queueUrl = await config.requireString('SQS_QUEUE_URL')
  const region = await config.requireString('SQS_QUEUE_REGION')

  const sqs = new SQS({ region: region })
  const params = {
    AttributeNames: ['SentTimestamp'],
    MaxNumberOfMessages: 10,
    MessageAttributeNames: ['All'],
    QueueUrl: queueUrl,
    WaitTimeSeconds: 15,
    VisibilityTimeout: 3 * 3600 // 3 hours
  }
  const sqsConsumer = new SQSConsumer(sqs, params)

  return {
    config,
    logs,
    server,
    statusChecks,
    metrics,
    pg,
    sqsConsumer
  }
}
