import { makeActivityLog } from './activityLog'
import { loadConfig } from './config'
import { makeConfigStore } from './configStore'
import { openDb } from './db'
import { startServer } from './http/server'
import { makeLogger } from './logger'
import { startSocket } from './socket'
import { makeWebhookDispatcher } from './webhooks'

const main = async () => {
	const config = loadConfig()
	const logger = makeLogger(config)

	const db = openDb(config.dbPath)
	const configStore = makeConfigStore(db)
	const activityLog = makeActivityLog(db)

	if (!configStore.getConfig().apiKey) {
		logger.warn('no API key configured yet - set one at /settings before calling the REST API')
	}

	const webhooks = makeWebhookDispatcher(configStore, logger)
	const bridge = await startSocket(config, logger, webhooks, activityLog)
	const server = startServer(config, logger, bridge, configStore, activityLog)

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
