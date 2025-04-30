import { HandlerContextWithPath, IWsHandler } from '../../types'

interface ConnectionData {
  connectionId: string
  ws: any // WebSocket instance
}

export function setupWebSocketEventsHandler(
  context: Pick<
    HandlerContextWithPath<'logs' | 'uwsServer' | 'memoryCache' | 'broadcaster', '/:address/notifications'>,
    'components'
  >
): IWsHandler {
  const { logs, uwsServer, memoryCache } = context.components
  const logger = logs.getLogger('websocket-events')

  uwsServer.app.get('/health/live', (res) => {
    res.writeStatus('200 OK')
    res.writeHeader('Access-Control-Allow-Origin', '*')
    res.end('alive')
  })

  uwsServer.app.get('/health/ready', (res) => {
    res.writeStatus('200 OK')
    res.writeHeader('Access-Control-Allow-Origin', '*')
    res.end('alive')
  })

  // Handle WebSocket connections using the UWS HTTP server
  uwsServer.app.ws('/:address/notifications', {
    upgrade: (res, req, context) => {
      const address = req.getParameter(0)
      logger.info(`Client connecting with address: ${address}`)

      res.upgrade(
        { address },
        req.getHeader('sec-websocket-key'),
        req.getHeader('sec-websocket-protocol'),
        req.getHeader('sec-websocket-extensions'),
        context
      )
    },

    open: (ws) => {
      const userData = ws.getUserData() as { address: string }
      const address = userData.address
      logger.info('WebSocket client connected', { address })

      // Get existing connections for this address or create new array
      const existingConnections = (memoryCache.get(address) as ConnectionData[]) || []

      // Add new connection
      const newConnection: ConnectionData = {
        connectionId: (ws as any).id.toString(),
        ws: ws
      }

      // Store updated connections array
      memoryCache.set(address, [...existingConnections, newConnection])
    },

    message: async (ws, message) => {
      try {
        const userData = ws.getUserData() as { address: string }
        const address = userData.address || 'unknown'
        const data = JSON.parse(Buffer.from(message).toString())

        if (data.metadata && !data.metadata.address) {
          data.metadata.address = address
        }

        logger.info(`Received event from ${address}:`, data)

        try {
          const parsedEvent = {
            metadata: {
              visitedParcel: data.new_parcel as string,
              address: address
            }
          }

          logger.info(`Processing event from ${address}:`, {
            parsedEvent: JSON.stringify(parsedEvent)
          })
        } catch (pubError) {
          logger.error('Error processing event', {
            error: pubError instanceof Error ? pubError.message : String(pubError)
          })
          ws.send(
            JSON.stringify({
              ok: false,
              error: 'Failed to process event'
            })
          )
        }
      } catch (error) {
        logger.error('Error processing WebSocket message', {
          error: error instanceof Error ? error.message : String(error)
        })
        ws.send(
          JSON.stringify({
            ok: false,
            error: 'Error processing message'
          })
        )
      }
    },

    close: (ws, code) => {
      const userData = ws.getUserData() as { address: string }
      const address = userData.address
      logger.info('WebSocket client disconnected', { address, code })

      // Remove the disconnected connection from memory cache
      const connections = (memoryCache.get(address) as ConnectionData[]) || []
      const updatedConnections = connections.filter((conn) => conn.connectionId !== (ws as any).id.toString())

      if (updatedConnections.length > 0) {
        memoryCache.set(address, updatedConnections)
      } else {
        memoryCache.set(address, [])
      }
    }
  })

  logger.info('WebSocket server for events set up')
  return { uwsServer }
}
