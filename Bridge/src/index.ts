import { loadConfig } from './config'
import { startServer } from './http/server'
import { makeLogger } from './logger'
import { startSocket } from './socket'
import { makeWebhookDispatcher } from './webhooks'

const main = async () => {
	const config = loadConfig()
	const logger = makeLogger(config)

	if (!config.webhookUrls.length) {
		logger.warn('WEBHOOK_URLS is empty - incoming messages will not be forwarded anywhere')
	}

	const webhooks = makeWebhookDispatcher(config.webhookUrls, logger)
	const bridge = await startSocket(config, logger, webhooks)
	const server = startServer(config, logger, bridge)

	const shutdown = () => {
		logger.info('shutting down')
		server.close(() => process.exit(0))
	}

	process.on('SIGINT', shutdown)
	process.on('SIGTERM', shutdown)
}

main().catch(err => {
	console.error(err)
	process.exit(1)
})
