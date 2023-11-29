import { AppComponents, INotificationProducer, IProducerRegistry } from '../types'

export async function createProducerRegistry(components: Pick<AppComponents, 'logs'>): Promise<IProducerRegistry> {
  const producers: Map<string, INotificationProducer> = new Map<string, INotificationProducer>()
  const { logs } = components
  const logger = logs.getLogger('producer-registry')

  function addProducer(producer: INotificationProducer) {
    if (producers.has(producer.notificationType())) {
      throw new Error(`Producer for ${producer.notificationType} already exists`)
    }
    logger.info(`Adding producer for ${producer.notificationType()}.`)
    producers.set(producer.notificationType(), producer)
  }

  async function start(): Promise<void> {
    for (const [_, value] of producers) {
      await value.init()
    }
  }

  return {
    addProducer,
    start
  }
}
