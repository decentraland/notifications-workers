import { AppComponents, INotificationProducer } from '../types'
import { itemSoldProducer } from '../logic/producers/item-sold'
import { IBaseComponent } from '@well-known-components/interfaces'
import { createProducer } from '../logic/producers/create-producer'

export async function createCheckUpdatesJob(
  components: Pick<AppComponents, 'config' | 'db' | 'logs' | 'l2CollectionsSubGraph'>
): Promise<IBaseComponent> {
  const producers: INotificationProducer[] = []

  async function start(): Promise<void> {
    // Add more producers here
    producers.push(await itemSoldProducer(components))

    for (const producer of producers) {
      const p = await createProducer(components, producer)
      await p.run()
    }
  }

  return {
    start
  }
}
