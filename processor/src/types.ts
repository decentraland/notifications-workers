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
import { NotificationType } from '@dcl/schemas'
import { DbComponent, ISendGridClient, NotificationRecord } from '@notifications/common'
import { INotificationsService } from './adapters/notifications-service'
import { IEmailRenderer } from './adapters/email-renderer'
import { ISubscriptionService } from './adapters/subscriptions-service'

export type AppComponents = {
  config: IConfigComponent
  db: DbComponent
  emailRenderer: IEmailRenderer
  fetch: IFetchComponent
  l2CollectionsSubGraph: ISubgraphComponent
  landManagerSubGraph: ISubgraphComponent
  logs: ILoggerComponent
  marketplaceSubGraph: ISubgraphComponent
  metrics: IMetricsComponent<keyof typeof metricDeclarations>
  notificationsService: INotificationsService
  pg: IPgComponent
  producerRegistry: IProducerRegistry
  rentalsSubGraph: ISubgraphComponent
  sendGridClient: ISendGridClient
  server: IHttpServerComponent<GlobalContext>
  statusChecks: IBaseComponent
  subscriptionService: ISubscriptionService
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

export type INotificationProducer = {
  start: () => Promise<void>
  notificationType: () => string
  runProducerSinceDate(date: number): Promise<void>
}

export type INotificationGenerator = {
  run(since: number): Promise<INotificationProducerResult>
  notificationType: NotificationType
}

export type IProducerRegistry = IBaseComponent & {
  addProducer: (producer: INotificationProducer) => void
  getProducer: (notificationType: string) => INotificationProducer
}

export type INotificationProducerResult = {
  notificationType: string
  records: NotificationRecord[]
  lastRun: number
}
