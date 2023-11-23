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
import { DecentralandSignatureContext } from '@dcl/platform-crypto-middleware'
import { ISubgraphComponent } from '@well-known-components/thegraph-component'
import { DbComponent } from './adapters/db'
import { NotificationRecord } from '@notifications/commons'

export type AppComponents = {
  config: IConfigComponent
  logs: ILoggerComponent
  server: IHttpServerComponent<GlobalContext>
  metrics: IMetricsComponent<keyof typeof metricDeclarations>
  pg: IPgComponent
  db: DbComponent
  statusChecks: IBaseComponent
  checkUpdatesJob: IBaseComponent
  marketplaceSubGraph: ISubgraphComponent
  rentalsSubGraph: ISubgraphComponent
}

// this type simplifies the typings of http handlers
export type HandlerContextWithPath<
  ComponentNames extends keyof AppComponents,
  Path extends string = any
> = IHttpServerComponent.PathAwareContext<
  IHttpServerComponent.DefaultContext<{
    components: Pick<AppComponents, ComponentNames>
  }>,
  Path
> &
  DecentralandSignatureContext<any>

export type GlobalContext = {
  components: AppComponents
}

// components used in tests
export type TestComponents = AppComponents & {
  // A fetch component that only hits the test server
  localFetch: IFetchComponent
}

export type NotificationError = {
  error: string
  message: string
}

export type IRunnable<T> = IBaseComponent & {
  run(): Promise<T>
}

export type INotificationProducer = {
  run(since: Date): Promise<INotificationProducerResult>
  notificationType: string
}

export type INotificationProducerResult = {
  notificationType: string
  records: NotificationRecord[]
  lastRun: Date
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

export class NotAuthorizedError extends Error {
  constructor(message: string) {
    super(message)
    Error.captureStackTrace(this, this.constructor)
  }
}
