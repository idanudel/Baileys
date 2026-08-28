import type { Chat, GroupMetadata } from '../../src'
import type { ChatSummary, GroupSummary } from './types'

const chats = new Map<string, Chat>()
const groups = new Map<string, GroupMetadata>()

export const upsertChats = (items: Chat[]) => {
	for (const chat of items) {
		if (chat.id) {
			chats.set(chat.id, chat)
		}
	}
}

export const updateChats = (items: Partial<Chat>[]) => {
	for (const update of items) {
		if (!update.id) {
			continue
		}

		chats.set(update.id, { ...chats.get(update.id), ...update } as Chat)
	}
}

export const deleteChats = (ids: string[]) => {
	for (const id of ids) {
		chats.delete(id)
	}
}

export const upsertGroups = (items: GroupMetadata[]) => {
	for (const group of items) {
		groups.set(group.id, group)
	}
}

export const updateGroups = (items: Partial<GroupMetadata>[]) => {
	for (const update of items) {
		const existing = update.id ? groups.get(update.id) : undefined
		if (!existing) {
			continue
		}

		groups.set(existing.id, { ...existing, ...update })
	}
}

export const listChats = (): ChatSummary[] =>
	[...chats.values()].map(chat => ({
		id: chat.id!,
		name: chat.name ?? undefined,
		unreadCount: chat.unreadCount ?? undefined
	}))

export const listGroups = (): GroupSummary[] =>
	[...groups.values()].map(group => ({ id: group.id, subject: group.subject, size: group.size }))
