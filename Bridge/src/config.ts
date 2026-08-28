import { Boom } from '@hapi/boom'

export type Config = {
	port: number
	apiKey: string
	webhookUrls: string[]
	authDir: string
	logLevel: string
}

const required = (name: string): string => {
	const value = process.env[name]
	if (!value) {
		throw new Boom(`missing required env var ${name}`, { statusCode: 500 })
	}

	return value
}

export const loadConfig = (): Config => ({
	port: Number(process.env.PORT ?? 7070),
	apiKey: required('API_KEY'),
	webhookUrls: (process.env.WEBHOOK_URLS ?? '')
		.split(',')
		.map(url => url.trim())
		.filter(Boolean),
	authDir: process.env.AUTH_DIR ?? './baileys_auth_info',
	logLevel: process.env.LOG_LEVEL ?? 'info'
})
