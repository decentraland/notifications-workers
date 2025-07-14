// This file is the "test-environment" analogous for src/components.ts
// Here we define the test components to be used in the testing environment

import { createRunner, createLocalFetchCompoment } from '@well-known-components/test-helpers'

import { main } from '../src/service'
import { IQueueConsumer, TestComponents } from '../src/types'
import { initComponents as originalInitComponents } from '../src/components'
import { createTestMetricsComponent } from '@well-known-components/metrics'
import { metricDeclarations } from '../src/metrics'
import { createDotEnvConfigComponent } from '@well-known-components/env-config-provider'

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

  const config = await createDotEnvConfigComponent(
    { path: ['.env.default'] },
    {
      NOTIFICATION_SERVICE_TOKEN: 'some-api-key',
      AWS_SQS_ENDPOINT: 'any'
    }
  )

  const queueConsumer: IQueueConsumer = {
    send: jest.fn(),
    receiveMessages: jest.fn(),
    deleteMessage: jest.fn()
  }

  return {
    ...components,
    config,
    metrics: createTestMetricsComponent(metricDeclarations),
    localFetch: await createLocalFetchCompoment(config),
    queueConsumer,
    messageProcessor: {
      start: jest.fn(),
      stop: jest.fn()
    }
  }
}
