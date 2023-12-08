import { AppComponents, INotificationGenerator, INotificationProducer } from '../types'
import { CronJob } from 'cron'

export async function createProducer(
  components: Pick<AppComponents, 'logs' | 'db'>,
  producer: INotificationGenerator
): Promise<INotificationProducer> {
  const { logs, db } = components
  const logger = logs.getLogger(`producer-${producer.notificationType}`)

  let lastSuccessfulRun: number | undefined

  async function runProducer(lastSuccessfulRun: number) {
    logger.info(`Checking for updates since ${lastSuccessfulRun}.`)

    const produced = await producer.run(lastSuccessfulRun)
    await db.insertNotifications(produced.records)
    await db.updateLastUpdateForNotificationType(produced.notificationType, produced.lastRun)
    logger.info(`Created ${produced.records.length} new notifications.`)
    return produced.lastRun
  }

  async function start(): Promise<void> {
    logger.info(`Scheduling producer for ${producer.notificationType}.`)

    const job = new CronJob(
      '0 * * * * *',
      async function () {
        try {
          if (!lastSuccessfulRun) {
            lastSuccessfulRun = await db.fetchLastUpdateForNotificationType(producer.notificationType)
          }
          lastSuccessfulRun = await runProducer(lastSuccessfulRun!)
        } catch (e: any) {
          logger.error(`Couldn't run producer: ${e.message}.`)
        }
      },
      null,
      false,
      'UCT'
    )
    job.start()
  }

  return {
    start,
    notificationType: () => producer.notificationType,
    runProducerSinceDate: async (date: number) => {
      await runProducer(date)
    }
  }
}
