import { Boom } from '@hapi/boom'
import { readFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import type { ConfigStore } from '../configStore'

const adminHtmlPath = fileURLToPath(new URL('./public/admin.html', import.meta.url))

const readJsonBody = async (req: IncomingMessage): Promise<unknown> => {
	const chunks: Buffer[] = []
	for await (const chunk of req) {
		chunks.push(chunk as Buffer)
	}

	return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}
}

export const handleAdminPage = async (res: ServerResponse) => {
	const html = await readFile(adminHtmlPath, 'utf8')
	res.writeHead(200, { 'content-type': 'text/html' })
	res.end(html)
}

export const handleGetConfig = (res: ServerResponse, configStore: ConfigStore) => {
	res.writeHead(200, { 'content-type': 'application/json' })
	res.end(JSON.stringify(configStore.getConfig()))
}

export const handleSetConfig = async (req: IncomingMessage, res: ServerResponse, configStore: ConfigStore) => {
	const body = (await readJsonBody(req)) as { apiKey?: string; webhookUrls?: string[] }

	if (body.apiKey !== undefined && !body.apiKey.trim()) {
		throw new Boom('apiKey cannot be empty', { statusCode: 400 })
	}

	configStore.setConfig(body)
	res.writeHead(200, { 'content-type': 'application/json' })
	res.end(JSON.stringify(configStore.getConfig()))
}
