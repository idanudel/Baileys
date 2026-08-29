import { Boom } from '@hapi/boom'
import { readFile } from 'node:fs/promises'
import type { ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'

const ASSETS: Record<string, { path: string; contentType: string }> = {
	'/assets/theme.css': { path: './public/theme.css', contentType: 'text/css' },
	'/assets/theme.js': { path: './public/theme.js', contentType: 'text/javascript' }
}

export const isStaticAsset = (pathname: string): boolean => pathname in ASSETS

export const handleStaticAsset = async (res: ServerResponse, pathname: string) => {
	const asset = ASSETS[pathname]
	if (!asset) {
		throw new Boom('not found', { statusCode: 404 })
	}

	const filePath = fileURLToPath(new URL(asset.path, import.meta.url))
	const body = await readFile(filePath, 'utf8')
	res.writeHead(200, { 'content-type': asset.contentType })
	res.end(body)
}
