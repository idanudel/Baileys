import type { ConfigStore } from './configStore'
import type { Logger } from './logger'
import type { WebhookPayload } from './types'

const RETRY_DELAYS_MS = [500, 2000]
const TIMEOUT_MS = 5_000

export type WebhookDeliveryOutcome = {
	webhookUrl: string
	ok: boolean
	statusCode?: number
	attempts: number
	error?: string
}

export const makeWebhookDispatcher = (configStore: ConfigStore, logger: Logger) => {
	const dispatchOnce = async (url: string, payload: WebhookPayload): Promise<{ ok: boolean; statusCode?: number; error?: string }> => {
		const controller = new AbortController()
		const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
		try {
			const res = await fetch(url, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload),
				signal: controller.signal
			})
			return { ok: res.ok, statusCode: res.status }
		} catch (err) {
			return { ok: false, error: err instanceof Error ? err.message : String(err) }
		} finally {
			clearTimeout(timeout)
		}
	}

	const dispatchWithRetries = async (url: string, payload: WebhookPayload): Promise<WebhookDeliveryOutcome> => {
		let attempts = 0
		let lastResult: { ok: boolean; statusCode?: number; error?: string } = { ok: false }

		for (let attempt = 0; ; attempt++) {
			attempts++
			lastResult = await dispatchOnce(url, payload)
			if (lastResult.ok) {
				break
			}

			const delay = RETRY_DELAYS_MS[attempt]
			logger.warn({ url, attempt, error: lastResult.error, statusCode: lastResult.statusCode }, 'webhook delivery attempt failed')
			if (delay === undefined) {
				break
			}

			await new Promise(resolve => setTimeout(resolve, delay))
		}

		return { webhookUrl: url, ok: lastResult.ok, statusCode: lastResult.statusCode, attempts, error: lastResult.error }
	}

	return {
		dispatch(payload: WebhookPayload, onDelivered: (outcome: WebhookDeliveryOutcome) => void) {
			for (const url of configStore.getConfig().webhookUrls) {
				void dispatchWithRetries(url, payload).then(onDelivered)
			}
		}
	}
}

export type WebhookDispatcher = ReturnType<typeof makeWebhookDispatcher>
