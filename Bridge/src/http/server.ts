import { Boom } from '@hapi/boom'
import { timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { ActivityLog } from '../activityLog'
import type { Config } from '../config'
import type { ConfigStore } from '../configStore'
import type { Logger } from '../logger'
import type { BridgeHandle } from '../socket'
import { handleDashboardPage, handleListActivity } from './dashboard'
import { handleListChats, handleListGroups, handleQr, handleSendMessage, handleStatus } from './routes'
import { handleGetConfig, handleSettingsPage, handleSetConfig } from './settings'
import { handleStaticAsset, isStaticAsset } from './static'

const UNAUTHENTICATED_PATHS = new Set([
	'/settings',
	'/dashboard',
	'/dashboard-example',
	'/api/config',
	'/api/activity',
	'/assets/theme.css',
	'/assets/theme.js',
	'/assets/favicon.svg'
])

const isAuthorized = (req: IncomingMessage, url: URL, apiKey: string): boolean => {
	if (!apiKey) {
		return false
	}

	const provided = req.headers['x-api-key'] ?? url.searchParams.get('key') ?? ''
	const providedBuf = Buffer.from(String(provided))
	const expectedBuf = Buffer.from(apiKey)

	return providedBuf.length === expectedBuf.length && timingSafeEqual(providedBuf, expectedBuf)
}

export const startServer = (config: Config, logger: Logger, bridge: BridgeHandle, configStore: ConfigStore, activityLog: ActivityLog) => {
	const server = createServer((req, res) => {
		void (async () => {
			try {
				const url = new URL(req.url ?? '/', 'http://localhost')

				if (!UNAUTHENTICATED_PATHS.has(url.pathname) && !isAuthorized(req, url, configStore.getConfig().apiKey)) {
					throw new Boom('invalid or missing api key', { statusCode: 401 })
				}

				if (req.method === 'GET' && isStaticAsset(url.pathname)) {
					await handleStaticAsset(res, url.pathname)
				} else if (req.method === 'GET' && url.pathname === '/settings') {
					await handleSettingsPage(res)
				} else if (req.method === 'GET' && (url.pathname === '/dashboard' || url.pathname === '/dashboard-example')) {
					await handleDashboardPage(res)
				} else if (req.method === 'GET' && url.pathname === '/api/config') {
					handleGetConfig(res, configStore)
				} else if (req.method === 'POST' && url.pathname === '/api/config') {
					await handleSetConfig(req, res, configStore)
				} else if (req.method === 'GET' && url.pathname === '/api/activity') {
					handleListActivity(res, activityLog)
				} else {
					const ctx = { req, res, bridge, activityLog }

					if (req.method === 'POST' && url.pathname === '/messages') {
						await handleSendMessage(ctx)
					} else if (req.method === 'GET' && url.pathname === '/chats') {
						handleListChats(ctx)
					} else if (req.method === 'GET' && url.pathname === '/groups') {
						handleListGroups(ctx)
					} else if (req.method === 'GET' && url.pathname === '/status') {
						handleStatus(ctx)
					} else if (req.method === 'GET' && url.pathname === '/qr') {
						await handleQr(ctx)
					} else {
						throw new Boom('not found', { statusCode: 404 })
					}
				}
			} catch (err) {
				const boom = err instanceof Boom ? err : new Boom('internal error', { statusCode: 500 })
				logger.warn({ err: boom, path: req.url }, 'request failed')
				res.writeHead(boom.output.statusCode, { 'content-type': 'application/json' })
				res.end(JSON.stringify({ error: boom.message }))
			}
		})()
	})

	server.listen(config.port, () => {
		logger.info({ port: config.port }, 'bridge listening')
	})

	return server
}
