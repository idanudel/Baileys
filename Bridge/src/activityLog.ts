import type { Db } from './db'

export type WebhookDeliveryRecord = {
	webhookUrl: string
	ok: boolean
	statusCode?: number
	attempts: number
	error?: string
}

export type ActivityRow = {
	id: number
	kind: 'inbound' | 'outbound'
	ts: number
	waFrom?: string
	waTo?: string
	text?: string
	callerIp?: string
	ok: boolean
	error?: string
	deliveries: (WebhookDeliveryRecord & { ts: number })[]
}

type MessageRow = {
	id: number
	kind: string
	ts: number
	wa_from: string | null
	wa_to: string | null
	text: string | null
	caller_ip: string | null
	ok: number
	error: string | null
}

type DeliveryRow = {
	message_id: number
	ts: number
	webhook_url: string
	ok: number
	status_code: number | null
	attempts: number
	error: string | null
}

export const makeActivityLog = (db: Db) => {
	const recordInboundMessage = (args: { from: string; to: string; text?: string }): number => {
		const result = db
			.prepare('INSERT INTO messages (kind, ts, wa_from, wa_to, text, ok) VALUES (?, ?, ?, ?, ?, 1)')
			.run('inbound', Date.now(), args.from, args.to, args.text ?? null)

		return Number(result.lastInsertRowid)
	}

	const recordOutboundMessage = (args: { to: string; text: string; callerIp?: string; ok: boolean; error?: string }): number => {
		const result = db
			.prepare(
				'INSERT INTO messages (kind, ts, wa_to, text, caller_ip, ok, error) VALUES (?, ?, ?, ?, ?, ?, ?)'
			)
			.run('outbound', Date.now(), args.to, args.text, args.callerIp ?? null, args.ok ? 1 : 0, args.error ?? null)

		return Number(result.lastInsertRowid)
	}

	const recordWebhookDelivery = (messageId: number, delivery: WebhookDeliveryRecord) => {
		db.prepare(
			'INSERT INTO webhook_deliveries (message_id, ts, webhook_url, ok, status_code, attempts, error) VALUES (?, ?, ?, ?, ?, ?, ?)'
		).run(messageId, Date.now(), delivery.webhookUrl, delivery.ok ? 1 : 0, delivery.statusCode ?? null, delivery.attempts, delivery.error ?? null)
	}

	const listActivity = (limit = 200): ActivityRow[] => {
		const messages = db
			.prepare('SELECT * FROM messages ORDER BY ts DESC LIMIT ?')
			.all(limit) as MessageRow[]

		if (!messages.length) {
			return []
		}

		const ids = messages.map(m => m.id)
		const placeholders = ids.map(() => '?').join(',')
		const deliveries = db
			.prepare(`SELECT * FROM webhook_deliveries WHERE message_id IN (${placeholders}) ORDER BY ts ASC`)
			.all(...ids) as DeliveryRow[]

		const deliveriesByMessage = new Map<number, (WebhookDeliveryRecord & { ts: number })[]>()
		for (const d of deliveries) {
			const list = deliveriesByMessage.get(d.message_id) ?? []
			list.push({
				webhookUrl: d.webhook_url,
				ok: !!d.ok,
				statusCode: d.status_code ?? undefined,
				attempts: d.attempts,
				error: d.error ?? undefined,
				ts: d.ts
			})
			deliveriesByMessage.set(d.message_id, list)
		}

		return messages.map(m => ({
			id: m.id,
			kind: m.kind as 'inbound' | 'outbound',
			ts: m.ts,
			waFrom: m.wa_from ?? undefined,
			waTo: m.wa_to ?? undefined,
			text: m.text ?? undefined,
			callerIp: m.caller_ip ?? undefined,
			ok: !!m.ok,
			error: m.error ?? undefined,
			deliveries: deliveriesByMessage.get(m.id) ?? []
		}))
	}

	return { recordInboundMessage, recordOutboundMessage, recordWebhookDelivery, listActivity }
}

export type ActivityLog = ReturnType<typeof makeActivityLog>
