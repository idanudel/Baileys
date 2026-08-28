import { Boom } from '@hapi/boom'
import type { IncomingMessage, ServerResponse } from 'node:http'
import QRCode from 'qrcode'
import { isJidGroup, isLidUser, isPnUser } from '../../../src'
import type { BridgeHandle } from '../socket'
import { listChats, listGroups } from '../store'
import type { SendMessageBody } from '../types'

export type RouteContext = {
	req: IncomingMessage
	res: ServerResponse
	bridge: BridgeHandle
}

const readJsonBody = async (req: IncomingMessage): Promise<unknown> => {
	const chunks: Buffer[] = []
	for await (const chunk of req) {
		chunks.push(chunk as Buffer)
	}

	if (!chunks.length) {
		return {}
	}

	return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const sendJson = (res: ServerResponse, statusCode: number, body: unknown) => {
	res.writeHead(statusCode, { 'content-type': 'application/json' })
	res.end(JSON.stringify(body))
}

export const handleSendMessage = async ({ req, res, bridge }: RouteContext) => {
	const body = (await readJsonBody(req)) as Partial<SendMessageBody>
	if (!body.jid || !body.text) {
		throw new Boom('jid and text are required', { statusCode: 400 })
	}

	if (!isPnUser(body.jid) && !isLidUser(body.jid) && !isJidGroup(body.jid)) {
		throw new Boom(`invalid jid: ${body.jid}`, { statusCode: 400 })
	}

	await bridge.sendText(body.jid, body.text)
	sendJson(res, 200, { ok: true })
}

export const handleListChats = ({ res }: RouteContext) => {
	sendJson(res, 200, listChats())
}

export const handleListGroups = ({ res }: RouteContext) => {
	sendJson(res, 200, listGroups())
}

export const handleStatus = ({ res, bridge }: RouteContext) => {
	sendJson(res, 200, bridge.getStatus())
}

export const handleQr = async ({ res, bridge }: RouteContext) => {
	const qr = bridge.getLatestQr()
	if (!qr) {
		throw new Boom('no pairing QR pending (already logged in, or not generated yet)', { statusCode: 404 })
	}

	const png = await QRCode.toBuffer(qr, { type: 'png' })
	res.writeHead(200, { 'content-type': 'image/png' })
	res.end(png)
}
