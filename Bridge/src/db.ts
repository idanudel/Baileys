import { DatabaseSync } from 'node:sqlite'

export const openDb = (dbPath: string): DatabaseSync => {
	const db = new DatabaseSync(dbPath)

	db.exec(`
		CREATE TABLE IF NOT EXISTS config (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			kind TEXT NOT NULL, -- 'inbound' | 'outbound'
			ts INTEGER NOT NULL,
			wa_from TEXT,
			wa_to TEXT,
			text TEXT,
			caller_ip TEXT,
			ok INTEGER NOT NULL,
			error TEXT
		);

		CREATE TABLE IF NOT EXISTS webhook_deliveries (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			message_id INTEGER NOT NULL REFERENCES messages(id),
			ts INTEGER NOT NULL,
			webhook_url TEXT NOT NULL,
			ok INTEGER NOT NULL,
			status_code INTEGER,
			attempts INTEGER NOT NULL,
			error TEXT
		);

		CREATE INDEX IF NOT EXISTS idx_messages_ts ON messages(ts);
		CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_message_id ON webhook_deliveries(message_id);
	`)

	return db
}

export type Db = DatabaseSync
