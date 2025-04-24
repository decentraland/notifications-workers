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
import { NotificationType, Event } from '@dcl/schemas'
import { Message } from '@aws-sdk/client-sqs'
import { DbComponent, ISendGridClient, NotificationRecord, ProfilesComponent } from '@notifications/common'
import { INotificationsService } from './adapters/notifications-service'
import { IEmailRenderer } from './adapters/email-renderer'
import { ISubscriptionService } from './adapters/subscriptions-service'

export type AppComponents = {
  config: IConfigComponent
  db: DbComponent
  emailRenderer: IEmailRenderer
  fetch: IFetchComponent
  logs: ILoggerComponent
  metrics: IMetricsComponent<keyof typeof metricDeclarations>
  notificationsService: INotificationsService
  pg: IPgComponent
  sendGridClient: ISendGridClient
  server: IHttpServerComponent<GlobalContext>
  statusChecks: IBaseComponent
  subscriptionService: ISubscriptionService
  queueConsumer: IQueueConsumer
  eventParser: IEventParser
  messageProcessor: IMessageProcessor
  profiles: ProfilesComponent
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
>

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

export type INotificationProducerResult = {
  notificationType: string
  records: NotificationRecord[]
  lastRun: number
}

export type QueueMessage = any

export type IQueueConsumer = {
  send(message: QueueMessage): Promise<void>
  receiveMessages(maxMessages: number): Promise<Message[]>
  deleteMessage(receiptHandle: string): Promise<void>
}

export type IMessageProcessor = IBaseComponent

export type IEventParser = {
  parseToNotification(event: Event): NotificationRecord | undefined
}
