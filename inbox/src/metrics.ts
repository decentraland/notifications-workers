import { getDefaultHttpMetrics, validateMetricsDeclaration } from '@well-known-components/metrics'
import { metricDeclarations as logMetricDeclarations } from '@well-known-components/logger'
import { metricDeclarations as pgMetricDeclarations } from '@well-known-components/pg-component'

export const metricDeclarations = {
  ...getDefaultHttpMetrics(),
  ...pgMetricDeclarations,
  ...logMetricDeclarations
}

// type assertions
validateMetricsDeclaration(metricDeclarations)
