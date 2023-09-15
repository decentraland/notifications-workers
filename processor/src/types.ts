import {
  IBaseComponent,
  IConfigComponent,
  IFetchComponent,
  IHttpServerComponent,
  ILoggerComponent,
  IMetricsComponent
} from '@well-known-components/interfaces'
import { metricDeclarations } from '@well-known-components/logger'
import { NotificationToSqs } from 'commons/dist/types'
import { IPgComponent } from '@well-known-components/pg-component'
import type * as authorizationMiddleware from 'decentraland-crypto-middleware'

export type IQueue = {
  receiveMessages(): Promise<void>
  publish(job: NotificationToSqs): Promise<string>
}

export type ProcessorComponents = {
  config: IConfigComponent
  logs: ILoggerComponent
  server: IHttpServerComponent<ProcessorGlobalContext>
  metrics: IMetricsComponent<keyof typeof metricDeclarations>
  pg: IPgComponent
  statusChecks: IBaseComponent
  sqs: IQueue
}

// this type simplifies the typings of http handlers
export type ProcessorHandlerContextWithPath<
  ComponentNames extends keyof ProcessorComponents,
  Path extends string = any
> = IHttpServerComponent.PathAwareContext<
  IHttpServerComponent.DefaultContext<{
    components: Pick<ProcessorComponents, ComponentNames>
  }>,
  Path
> &
  authorizationMiddleware.DecentralandSignatureContext

export type ProcessorGlobalContext = {
  components: ProcessorComponents
}

// components used in tests
export type ProcessorTestComponents = ProcessorComponents & {
  // A fetch component that only hits the test server
  localFetch: IFetchComponent
}
