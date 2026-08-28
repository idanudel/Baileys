export type SendMessageBody = {
	jid: string
	text: string
}

export type ChatSummary = {
	id: string
	name?: string
	unreadCount?: number
}

export type GroupSummary = {
	id: string
	subject: string
	size?: number
}

export type StatusResponse = {
	connected: boolean
	loggedIn: boolean
	qrPending: boolean
	user?: string
}

export type WebhookPayload = {
	event: 'message'
	timestamp: number
	data: {
		id: string
		chatId: string
		fromMe: boolean
		sender?: string
		text?: string
		type: 'text' | 'other'
	}
}
