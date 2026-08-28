export type Config = {
	port: number
	authDir: string
	logLevel: string
	dbPath: string
}

export const loadConfig = (): Config => ({
	port: Number(process.env.PORT ?? 7070),
	authDir: process.env.AUTH_DIR ?? './baileys_auth_info',
	logLevel: process.env.LOG_LEVEL ?? 'info',
	dbPath: process.env.DB_PATH ?? './bridge.db'
})
