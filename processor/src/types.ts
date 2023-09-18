import {
  IBaseComponent,
  IConfigComponent,
  IFetchComponent,
  IHttpServerComponent,
  ILoggerComponent,
  IMetricsComponent
} from '@well-known-components/interfaces'
import { metricDeclarations } from '@well-known-components/logger'
import { IPgComponent } from '@well-known-components/pg-component'
import { NotificationToSqs } from 'commons/dist/logic/db'
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

export type NotificationError = {
  error: string
  message: string
}

export class InvalidRequestError extends Error {
  constructor(message: string) {
    super(message)
    Error.captureStackTrace(this, this.constructor)
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    Error.captureStackTrace(this, this.constructor)
  }
}