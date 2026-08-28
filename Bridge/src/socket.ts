import { Boom } from '@hapi/boom'
import makeWASocket, {
	DisconnectReason,
	fetchLatestBaileysVersion,
	makeCacheableSignalKeyStore,
	useMultiFileAuthState,
	type WASocket
} from '../../src'
import type { Config } from './config'
import type { Logger } from './logger'
import { deleteChats, updateChats, updateGroups, upsertChats, upsertGroups } from './store'
import type { StatusResponse, WebhookPayload } from './types'
import type { WebhookDispatcher } from './webhooks'

export type BridgeHandle = {
	sendText: (jid: string, text: string) => Promise<void>
	getStatus: () => StatusResponse
	getLatestQr: () => string | undefined
}

export const startSocket = async (config: Config, logger: Logger, webhooks: WebhookDispatcher): Promise<BridgeHandle> => {
	const { state, saveCreds } = await useMultiFileAuthState(config.authDir)
	const { version } = await fetchLatestBaileysVersion()

	let sock!: WASocket
	let latestQr: string | undefined
	let connected = false

	const connect = () => {
		sock = makeWASocket({
			version,
			logger,
			auth: {
				creds: state.creds,
				keys: makeCacheableSignalKeyStore(state.keys, logger)
			},
			getMessage: async () => undefined
		})

		sock.ev.process(async events => {
			const connectionUpdate = events['connection.update']
			if (connectionUpdate) {
				const { connection, lastDisconnect, qr } = connectionUpdate

				if (qr) {
					latestQr = qr
				}

				if (connection === 'open') {
					latestQr = undefined
					connected = true
				}

				if (connection === 'close') {
					connected = false
					const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
					if (statusCode !== DisconnectReason.loggedOut) {
						logger.warn({ statusCode }, 'connection closed, reconnecting')
						connect()
					} else {
						logger.fatal('logged out - delete the auth dir and restart to re-pair')
					}
				}
			}

			if (events['creds.update']) {
				await saveCreds()
			}

			if (events['chats.upsert']) {
				upsertChats(events['chats.upsert'])
			}

			if (events['chats.update']) {
				updateChats(events['chats.update'])
			}

			if (events['chats.delete']) {
				deleteChats(events['chats.delete'])
			}

			if (events['groups.upsert']) {
				upsertGroups(events['groups.upsert'])
			}

			if (events['groups.update']) {
				updateGroups(events['groups.update'])
			}

			if (events['messaging-history.set']) {
				upsertChats(events['messaging-history.set'].chats)
			}

			const upsert = events['messages.upsert']
			if (upsert?.type === 'notify') {
				for (const msg of upsert.messages) {
					if (!msg.message || !msg.key.remoteJid) {
						continue
					}

					const text = msg.message.conversation ?? msg.message.extendedTextMessage?.text ?? undefined
					const payload: WebhookPayload = {
						event: 'message',
						timestamp: Date.now(),
						data: {
							id: msg.key.id ?? '',
							chatId: msg.key.remoteJid,
							fromMe: !!msg.key.fromMe,
							sender: msg.key.participant ?? msg.key.remoteJid,
							text,
							type: text ? 'text' : 'other'
						}
					}

					webhooks.dispatch(payload)
				}
			}
		})
	}

	connect()

	return {
		sendText: async (jid, text) => {
			await sock.sendMessage(jid, { text })
		},
		getStatus: () => ({
			connected,
			loggedIn: !!state.creds.registered,
			qrPending: !!latestQr,
			user: sock.user?.id
		}),
		getLatestQr: () => latestQr
	}
}
