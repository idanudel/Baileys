import { Boom } from '@hapi/boom'
import { timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { Config } from '../config'
import type { Logger } from '../logger'
import type { BridgeHandle } from '../socket'
import { handleListChats, handleListGroups, handleQr, handleSendMessage, handleStatus } from './routes'

const isAuthorized = (req: IncomingMessage, url: URL, apiKey: string): boolean => {
	const provided = req.headers['x-api-key'] ?? url.searchParams.get('key') ?? ''
	const providedBuf = Buffer.from(String(provided))
	const expectedBuf = Buffer.from(apiKey)

	return providedBuf.length === expectedBuf.length && timingSafeEqual(providedBuf, expectedBuf)
}

export const startServer = (config: Config, logger: Logger, bridge: BridgeHandle) => {
	const server = createServer((req, res) => {
		void (async () => {
			try {
				const url = new URL(req.url ?? '/', 'http://localhost')

				if (!isAuthorized(req, url, config.apiKey)) {
					throw new Boom('invalid or missing api key', { statusCode: 401 })
				}

				const ctx = { req, res, bridge }

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
