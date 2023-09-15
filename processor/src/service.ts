import { Lifecycle } from '@well-known-components/interfaces'
import { setupRouter } from './controllers/routes'
import { ProcessorComponents, ProcessorGlobalContext, ProcessorTestComponents } from './types'

// this function wires the business logic (adapters & controllers) with the components (ports)
export async function main(program: Lifecycle.EntryPointParameters<ProcessorComponents | ProcessorTestComponents>) {
  const { components, startComponents } = program
  const globalContext: ProcessorGlobalContext = {
    components
  }

  // wire the HTTP router (make it automatic? TBD)
  const router = await setupRouter(globalContext)
  // register routes middleware
  components.server.use(router.middleware())
  // register not implemented/method not allowed/cors responses middleware
  components.server.use(router.allowedMethods())
  // set the context to be passed to the handlers
  components.server.setContext(globalContext)

  // start ports: db, listeners, synchronizations, etc
  await startComponents()

  // start listener to SQS queue
  components.sqs.receiveMessages().catch((e) => {
    components.logs.getLogger('Listen SQS').error(`Error receiving messages from SQS: ${e}`)
  })
}
