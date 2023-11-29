import { AppComponents, INotificationGenerator, INotificationProducer } from '../types'
import { CronJob } from 'cron'

export async function createProducer(
  components: Pick<AppComponents, 'logs' | 'db'>,
  producer: INotificationGenerator
): Promise<INotificationProducer> {
  const { logs, db } = components
  const logger = logs.getLogger(`producer-${producer.notificationType}`)

  let lastSuccessfulRun: Date | undefined

  async function runProducer() {
    if (!lastSuccessfulRun) {
      lastSuccessfulRun = new Date(await db.fetchLastUpdateForNotificationType(producer.notificationType))
    }

    logger.info('Checking for updates since ' + lastSuccessfulRun.toISOString())

    const produced = await producer.run(lastSuccessfulRun)
    await db.insertNotifications(produced.records)
    await db.updateLastUpdateForNotificationType(produced.notificationType, produced.lastRun)
    lastSuccessfulRun = produced.lastRun
    logger.info(`Created ${produced.records.length} new notifications`)
  }

  async function init(): Promise<void> {
    logger.info(`Scheduling producer for ${producer.notificationType}.`)

    const job = new CronJob(
      '0 * * * * *',
      async function () {
        await runProducer()
      },
      null,
      false,
      'UCT'
    )
    job.start()
  }

  return {
    init,
    notificationType: () => producer.notificationType
  }
}
