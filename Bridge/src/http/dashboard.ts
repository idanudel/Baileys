import { readFile } from 'node:fs/promises'
import type { ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import type { ActivityLog } from '../activityLog'

const dashboardHtmlPath = fileURLToPath(new URL('./public/dashboard.html', import.meta.url))

export const handleDashboardPage = async (res: ServerResponse) => {
	const html = await readFile(dashboardHtmlPath, 'utf8')
	res.writeHead(200, { 'content-type': 'text/html' })
	res.end(html)
}

export const handleListActivity = (res: ServerResponse, activityLog: ActivityLog) => {
	res.writeHead(200, { 'content-type': 'application/json' })
	res.end(JSON.stringify(activityLog.listActivity()))
}
