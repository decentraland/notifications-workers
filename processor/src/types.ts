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

export type AppComponents = {
  config: IConfigComponent
  logs: ILoggerComponent
  server: IHttpServerComponent<GlobalContext>
  metrics: IMetricsComponent<keyof typeof metricDeclarations>
  pg: IPgComponent
  db: DbComponent
  statusChecks: IBaseComponent
  producerRegistry: IProducerRegistry
  l2CollectionsSubGraph: ISubgraphComponent
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

export type INotificationProducer = {
  start: () => Promise<void>
  notificationType: () => string
  setLastSuccessfulRun(date: Date): void
}

export type INotificationGenerator = {
  run(since: Date): Promise<INotificationProducerResult>
  notificationType: string
}

export type IProducerRegistry = IBaseComponent & {
  addProducer: (producer: INotificationProducer) => void
  getProducer: (notificationType: string) => INotificationProducer
}

export type NotificationRecord = {
  eventKey: string
  type: string
  address: string
  metadata: any
  timestamp: number
}

export type INotificationProducerResult = {
  notificationType: string
  records: NotificationRecord[]
  lastRun: Date
}
