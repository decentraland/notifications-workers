// This file is the "test-environment" analogous for src/components.ts
// Here we define the test components to be used in the testing environment

import { createLocalFetchCompoment, createRunner } from '@well-known-components/test-helpers'

import { main } from '../src/service'
import { TestComponents } from '../src/types'
import { initComponents as originalInitComponents } from '../src/components'
import { createTestMetricsComponent } from '@well-known-components/metrics'
import { metricDeclarations } from '../src/metrics'
import { createConfigComponent } from '@well-known-components/env-config-provider'
import { createLogComponent } from '@well-known-components/logger'
import { createPgComponent } from '@well-known-components/pg-component'
import path from 'path'
import { createDbComponent, createDummyDataWarehouseClient } from '@notifications/common'

/**
 * Behaves like Jest "describe" function, used to describe a test for a
 * use case, it creates a whole new program and components to run an
 * isolated test.
 *
 * State is persistent within the steps of the test.
 */
export const test = createRunner<TestComponents>({
  main,
  initComponents
})

async function initComponents(): Promise<TestComponents> {
  const components = await originalInitComponents()
  const config = createConfigComponent({
    ...process.env,
    LOG_LEVEL: 'INFO',
    SIGNING_KEY: 'random-key',
    ENV: 'dev',
    ORIGIN_EXPECTED_FOR_CLOUDFLARE_CHALLENGE: 'http://localhost:8080',
    CLOUDFLARE_SECRET: '0x0000000000000000000000000000000000000000',
    SERVICE_BASE_URL: 'https://notifications-workers.decentraland.zone'
  })

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
  const pg = await createPgComponent(components, {
    migration: {
      databaseUrl,
      dir: path.resolve(__dirname, '../../processor/src/migrations'),
      migrationsTable: 'pgmigrations',
      ignorePattern: '.*\\.map',
      direction: 'up'
    }
  })
  const db = createDbComponent({ pg })

  const dataWarehouseClient = await createDummyDataWarehouseClient({
    logs: components.logs
  })

  return {
    ...components,
    pg,
    db,
    logs: await createLogComponent({ config }),
    config,
    localFetch: await createLocalFetchCompoment(config),
    metrics: createTestMetricsComponent(metricDeclarations),
    dataWarehouseClient
  }
}
