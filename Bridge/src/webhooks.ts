import type { Logger } from './logger'
import type { WebhookPayload } from './types'

const RETRY_DELAYS_MS = [500, 2000]
const TIMEOUT_MS = 5_000

export const makeWebhookDispatcher = (urls: string[], logger: Logger) => {
	const dispatchOnce = async (url: string, payload: WebhookPayload): Promise<boolean> => {
		const controller = new AbortController()
		const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
		try {
			const res = await fetch(url, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload),
				signal: controller.signal
			})
			return res.ok
		} catch {
			return false
		} finally {
			clearTimeout(timeout)
		}
	}

	const dispatchWithRetries = async (url: string, payload: WebhookPayload) => {
		for (let attempt = 0; ; attempt++) {
			const delivered = await dispatchOnce(url, payload)
			if (delivered) {
				return
			}

			const delay = RETRY_DELAYS_MS[attempt]
			logger.warn({ url, attempt }, 'webhook delivery attempt failed')
			if (delay === undefined) {
				return
			}

			await new Promise(resolve => setTimeout(resolve, delay))
		}
	}

	return {
		dispatch(payload: WebhookPayload) {
			for (const url of urls) {
				void dispatchWithRetries(url, payload)
			}
		}
	}
}

export type WebhookDispatcher = ReturnType<typeof makeWebhookDispatcher>
