import { validateMetricsDeclaration } from '@well-known-components/metrics'
import { metricDeclarations as logMetricDeclarations } from '@well-known-components/logger'
import { metricDeclarations as pgMetricDeclarations } from '@well-known-components/pg-component'
import { metricDeclarations as theGraphMetricDeclarations } from '@well-known-components/thegraph-component'
import { getDefaultHttpMetrics } from '@well-known-components/http-server'
import { IMetricsComponent } from '@well-known-components/interfaces'

export const metricDeclarations = {
  ...getDefaultHttpMetrics(),
  ...logMetricDeclarations,
  ...pgMetricDeclarations,
  ...theGraphMetricDeclarations,
  // This metric will be only be used to help migrating the process to
  // SQS/SNS architecture. It will be removed once the migration is done.
  parallel_processing_counter: {
    help: 'Count of parallel processing',
    type: IMetricsComponent.CounterType,
    labelNames: ['eventKey', 'eventType', 'workflow', 'timestamp']
  }
}

// type assertions
validateMetricsDeclaration(metricDeclarations)
