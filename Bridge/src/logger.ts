import P from 'pino'
import type { Config } from './config'

export const makeLogger = (config: Config) => P({ level: config.logLevel, name: 'baileys-bridge' })

export type Logger = ReturnType<typeof makeLogger>
