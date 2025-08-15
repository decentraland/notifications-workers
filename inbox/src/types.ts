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
import { DecentralandSignatureContext } from '@dcl/platform-crypto-middleware'
import { Readable } from 'node:stream'
import { DbComponent, IDataWarehouseClient, ISendGridClient, IProfilesComponent } from '@notifications/common'
import { IEmailRenderer } from './adapters/email-renderer'
import { IPageRenderer } from './adapters/page-renderer'
import { IFeaturesComponent } from '@well-known-components/features-component'
import { IFeatureFlagsAdapter } from './adapters/feature-flags-adapter'
import { IChallengerAdapter } from './adapters/challenger-adapter'
import { IDomainValidator } from './logic/domain-validator'

export type GlobalContext = {
  components: BaseComponents
}

// components used in every environment
export type BaseComponents = {
  config: IConfigComponent
  db: DbComponent
  dataWarehouseClient: IDataWarehouseClient
  emailRenderer: IEmailRenderer
  fetch: IFetchComponent
  logs: ILoggerComponent
  metrics: IMetricsComponent<keyof typeof metricDeclarations>
  pageRenderer: IPageRenderer
  pg: IPgComponent
  sendGridClient: ISendGridClient
  server: IHttpServerComponent<GlobalContext>
  profiles: IProfilesComponent
  challengerAdapter: IChallengerAdapter
  features: IFeaturesComponent
  featureFlagsAdapter: IFeatureFlagsAdapter
  domainValidator: IDomainValidator
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
  DecentralandSignatureContext<any>

export type Client = {
  userId: string
  stream: Pick<Readable, 'push'>
}

export type NotificationEvent = {
  id: string
  type: string
  address: string
  metadata: any
  timestamp: number
  read: boolean
}

export enum Feature {
  TURNSTILE_VERIFICATION = 'turnstile-verification',
  CREDITS_BLACKLISTED_EMAILS_DOMAIN = 'credits-blacklisted-domain'
}
