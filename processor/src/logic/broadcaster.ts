import { NotificationRecord } from '@notifications/common'
import { AppComponents, IBroadcaster } from '../types'

interface ConnectionData {
  connectionId: string
  ws: any // WebSocket instance
}

export function createBroadcasterComponent({
  memoryCache,
  logs
}: Pick<AppComponents, 'memoryCache' | 'logs'>): IBroadcaster {
  const logger = logs.getLogger('broadcaster')

  return {
    sendMessageToAddress: (address: string, message: NotificationRecord) => {
      const connections = (memoryCache.get(address) as ConnectionData[]) || []
      connections.forEach((connection) => {
        try {
          connection.ws.send(JSON.stringify(message))
        } catch (error) {
          logger.error('Error sending message to connection', {
            address,
            error: error instanceof Error ? error.message : String(error)
          })
        }
      })
    }
  }
}
