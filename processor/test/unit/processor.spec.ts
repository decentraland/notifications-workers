// import { createProcessorComponent } from '../../src/adapters/processor'
// import { IPgComponent, createPgComponent } from '@well-known-components/pg-component'
// import { createLogComponent } from '@well-known-components/logger'
// import { createDotEnvConfigComponent } from '@well-known-components/env-config-provider'
// import { createTestMetricsComponent } from '@well-known-components/metrics'
// import { IConfigComponent, ILoggerComponent } from '@well-known-components/interfaces'
//
describe('processor component unit tests', () => {
  test('should work', async () => {})
  //   let pg: IPgComponent
  //   let logs: ILoggerComponent
  //   let config: IConfigComponent
  //
  //   beforeAll(async () => {
  //     logs = await createLogComponent({})
  //     config = await createDotEnvConfigComponent({ path: ['.env.default', '.env'] })
  //     const metrics = createTestMetricsComponent({})
  //     pg = await createPgComponent({ logs, config, metrics })
  //   })
  //
  //   beforeEach(async () => {
  //     await pg.query('TRUNCATE notifications, users_notifications, failed_notifications')
  //   })
  //
  //   it('should work', async () => {
  //     const sqs = {
  //       poll: jest.fn(),
  //       deleteMessage: jest.fn(),
  //       publish: jest.fn()
  //     }
  //
  //     const notification1 = {
  //       sid: 'n1',
  //       epoch: Date.now(),
  //       users: ['user1', 'user2']
  //     }
  //
  //     const message1 = {
  //       Body: JSON.stringify({
  //         Message: JSON.stringify(notification1)
  //       }),
  //       ReceiptHandle: 'receipt1'
  //     }
  //
  //     const message2 = {
  //       // no sid: invalid message
  //       Body: JSON.stringify({
  //         Message: JSON.stringify({
  //           epoch: Date.now(),
  //           users: ['user1', 'user2']
  //         })
  //       }),
  //       ReceiptHandle: 'receipt2'
  //     }
  //
  //     sqs.poll.mockResolvedValueOnce([message1, message2])
  //
  //     const processor = await createProcessorComponent({ config, logs, pg, sqs })
  //
  //     await processor.process()
  //
  //     {
  //       const notifications = await pg.query('select * from notifications')
  //       expect(notifications.rowCount).toEqual(1)
  //       const notification = notifications.rows[0]
  //       expect(notification.origin_id).toEqual(notification1.sid)
  //       expect(notification.type).toEqual('dcl')
  //       expect(notification.source).toEqual('push')
  //
  //       const userNotifications = await pg.query('select * from users_notifications')
  //       expect(userNotifications.rowCount).toEqual(2)
  //       for (const userNotification of userNotifications.rows) {
  //         expect(userNotification.read).toBeFalsy()
  //         expect(userNotification.notification_id).toEqual(notification.id)
  //       }
  //     }
  //
  //     {
  //       const results = await pg.query('select metadata from failed_notifications')
  //       expect(results.rowCount).toEqual(1)
  //       expect(results.rows[0].metadata).toEqual(message2.Body)
  //     }
  //
  //     expect(sqs.deleteMessage).toHaveBeenCalledWith('receipt1')
  //     expect(sqs.deleteMessage).toHaveBeenCalledWith('receipt2')
  //   })
})
