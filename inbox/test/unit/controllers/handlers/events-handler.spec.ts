import { Readable } from 'stream'
import { eventsHandler } from '../../../../src/controllers/handlers/events-handler'
import { createLogComponent } from '@well-known-components/logger'
import { ILoggerComponent } from '@well-known-components/interfaces'
import { EventsDispatcherComponent } from '../../../../src/types'

describe('events handler unit test', () => {
  let logs: ILoggerComponent

  beforeEach(async () => {
    logs = await createLogComponent({})
  })

  function executeHandler(eventsDispatcher: EventsDispatcherComponent) {
    const verification = {
      auth: 'user1',
      authMetadata: {}
    }
    return eventsHandler({ components: { logs, eventsDispatcher }, verification })
  }

  it('should register and unregister the client', async () => {
    let clientStream: Readable
    const eventsDispatcher = {
      addClient: jest.fn().mockImplementationOnce(({ stream }) => {
        clientStream = stream
        return 'session1'
      }),
      removeClient: jest.fn()
    } as any

    await executeHandler(eventsDispatcher)

    expect(eventsDispatcher.addClient).toHaveBeenCalledTimes(1)

    clientStream.destroy()

    expect(eventsDispatcher.removeClient).toHaveBeenCalledWith('session1')
  })
})
