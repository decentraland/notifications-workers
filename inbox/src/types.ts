import type {
    IConfigComponent,
    ILoggerComponent,
    IHttpServerComponent,
    IBaseComponent,
    IMetricsComponent,
    IFetchComponent
  } from '@well-known-components/interfaces'
  import { metricDeclarations } from './metrics'
  import { IPgComponent } from '@well-known-components/pg-component'
  import type * as authorizationMiddleware from 'decentraland-crypto-middleware'
  
  export type GlobalContext = {
    components: BaseComponents
  }
  
  // components used in every environment
  export type BaseComponents = {
    config: IConfigComponent
    logs: ILoggerComponent
    server: IHttpServerComponent<GlobalContext>
    metrics: IMetricsComponent<keyof typeof metricDeclarations>
    pg: IPgComponent
  }
  
  // components used in runtime
  export type AppComponents = BaseComponents & {
    statusChecks: IBaseComponent
  }
  
  // components used in tests
  export type TestComponents = BaseComponents & {
    // A fetch component that only hits the test server
    localFetch: IFetchComponent
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
  
  /// DB
  
  export type UsersNotification = {
    id: string
    address: string
    notification_id: string
    timestamp: number
    read: boolean
    created_at: number
    updated_at: number
  }
  
  export type Notification = {
    id: string
    type: string
    source: string
    metadata: any
    timestamp: number
    created_at: number
    updated_at: number
  }
  
  export type NotificationEvent = {
    notification_id: string
    origin_id: string
    type: string
    source: string
    metadata: any
    timestamp: number
    read: boolean
    created_at: number
    updated_at: number
    address: string
  }