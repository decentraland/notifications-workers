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
import type * as authorizationMiddleware from 'decentraland-crypto-middleware'
import { PushNotification } from '@notifications/commons'
import { SQSComponent } from './adapters/sqs'
import { ProcessorComponent } from './adapters/processor'

export type NotificationToSqs = {
  Message: PushNotification // Do not change this name is from SQS
}

export type AppComponents = {
  config: IConfigComponent
  logs: ILoggerComponent
  server: IHttpServerComponent<GlobalContext>
  metrics: IMetricsComponent<keyof typeof metricDeclarations>
  pg: IPgComponent
  statusChecks: IBaseComponent
  sqs: SQSComponent
  processor: ProcessorComponent
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
  authorizationMiddleware.DecentralandSignatureContext

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
