import type { Db } from './db'

export type LiveConfig = {
	apiKey: string
	webhookUrls: string[]
}

const parseWebhookUrls = (value: string): string[] =>
	value
		.split('\n')
		.map(url => url.trim())
		.filter(Boolean)

export const makeConfigStore = (db: Db) => {
	const getRaw = (key: string): string | undefined => {
		const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key) as { value: string } | undefined
		return row?.value
	}

	const setRaw = (key: string, value: string) => {
		db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, value)
	}

	const seedFromEnv = () => {
		if (getRaw('api_key') === undefined && process.env.API_KEY) {
			setRaw('api_key', process.env.API_KEY)
		}

		if (getRaw('webhook_urls') === undefined && process.env.WEBHOOK_URLS) {
			const seeded = process.env.WEBHOOK_URLS.split(',')
				.map(url => url.trim())
				.filter(Boolean)
				.join('\n')
			setRaw('webhook_urls', seeded)
		}
	}

	seedFromEnv()

	return {
		getConfig: (): LiveConfig => ({
			apiKey: getRaw('api_key') ?? '',
			webhookUrls: parseWebhookUrls(getRaw('webhook_urls') ?? '')
		}),
		setConfig: (update: { apiKey?: string; webhookUrls?: string[] }) => {
			if (update.apiKey !== undefined) {
				setRaw('api_key', update.apiKey)
			}

			if (update.webhookUrls !== undefined) {
				setRaw('webhook_urls', update.webhookUrls.join('\n'))
			}
		}
	}
}

export type ConfigStore = ReturnType<typeof makeConfigStore>
