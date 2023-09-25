import { Readable } from 'stream'
import { EventsDispatcherComponent } from '../../src/adapters/events-dispatcher'
import { eventsHandler } from '../../src/controllers/handlers/events-handler'

describe('events handler unit test', () => {
  function executeHandler(eventsDispatcher: EventsDispatcherComponent) {
    const verification = {
      auth: 'user1',
      authMetadata: {}
    }
    return eventsHandler({ components: { eventsDispatcher }, verification })
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
