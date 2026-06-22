import { validateMetricsDeclaration } from '@dcl/metrics'
import { metricDeclarations as logMetricDeclarations } from '@well-known-components/logger'
import { metricDeclarations as pgMetricDeclarations } from '@dcl/pg-component'
import { getDefaultHttpMetrics } from '@dcl/http-server'

export const metricDeclarations = {
  ...getDefaultHttpMetrics(),
  ...logMetricDeclarations,
  ...pgMetricDeclarations
}

// type assertions
validateMetricsDeclaration(metricDeclarations)
