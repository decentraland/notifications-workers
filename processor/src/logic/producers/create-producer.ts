import { AppComponents, INotificationProducer, IRunnable } from '../../types'
import { CronJob } from 'cron'

export async function createProducer(
  components: Pick<AppComponents, 'logs' | 'marketplaceSubGraph' | 'db'>,
  producer: INotificationProducer
): Promise<IRunnable<void>> {
  const { logs, db } = components
  const logger = logs.getLogger(`producer-${producer.notificationType}`)

  let lastSuccessfulRun: Date | undefined

  async function runProducer() {
    logger.info('Checking for updates since ' + lastSuccessfulRun!.toISOString())

    const produced = await producer.run(lastSuccessfulRun!)
    await db.insertNotifications(produced.records)
    await db.updateLastUpdateForNotificationType(produced.notificationType, produced.lastRun)
    lastSuccessfulRun = produced.lastRun
    logger.info(`Created ${produced.records.length} new notifications`)
  }

  async function run(): Promise<void> {
    logger.info('Scheduling check updates job')

    lastSuccessfulRun = new Date(await db.fetchLastUpdateForNotificationType(producer.notificationType))

    const job = new CronJob(
      '0/30 * * * * *',
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
    run
  }
}
