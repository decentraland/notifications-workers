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
      logger.info('Broadcasting message to address', {
        address,
        connectionCount: connections.length
      })

      if (connections.length === 0) {
        return
      }

      connections.forEach((connection) => {
        try {
          const messageStr = JSON.stringify(message)
          connection.ws.send(messageStr)
        } catch (error) {
          logger.error('Error sending message to connection', {
            address,
            connectionId: connection.connectionId,
            error: error instanceof Error ? error.message : String(error)
          })
        }
      })
    }
  }
}
