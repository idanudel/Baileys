# Baileys Bridge

Standalone REST + webhook wrapper around a single WhatsApp account, built on this
repo's Baileys library (`../src`). Not part of the published `baileys` npm package —
this is a personal service, kept in its own `package.json`/`node_modules`.

## Run locally

```sh
cd Bridge
npm install
cp .env.example .env   # set API_KEY, optionally WEBHOOK_URLS
npm run dev
```

First run has no saved session: open `GET /qr` (see below) and scan with WhatsApp.
Credentials are then persisted to `AUTH_DIR` (default `./baileys_auth_info`, already
covered by the repo's root `.gitignore`) so future restarts don't need a new scan.

## API

All endpoints require the shared secret in an `x-api-key` header. `GET /qr` also
accepts it as a `?key=` query param, since browsers can't set custom headers by just
navigating to a URL.

| Method | Path | Description |
|---|---|---|
| GET | `/status` | `{ connected, loggedIn, qrPending, user }` |
| GET | `/qr` | PNG of the current pairing QR, or 404 if not pending |
| GET | `/chats` | Known chats (populated after initial sync) |
| GET | `/groups` | Known groups (populated after initial sync) |
| POST | `/messages` | `{ "jid": "<number>@s.whatsapp.net" \| "<id>@g.us", "text": "..." }` |

Incoming messages are POSTed to each URL in `WEBHOOK_URLS` (comma-separated) as:

```json
{
	"event": "message",
	"timestamp": 1234567890,
	"data": {
		"id": "...",
		"chatId": "1234567890@s.whatsapp.net",
		"fromMe": false,
		"sender": "1234567890@s.whatsapp.net",
		"text": "hello",
		"type": "text"
	}
}
```

Delivery is fire-and-forget with up to 2 retries; failures are logged and never
affect the WhatsApp connection itself.

## Deploy (Raspberry Pi)

See `deploy/setup.sh` and `deploy/baileys-bridge.service` — installs a systemd unit
that runs `tsx src/index.ts` directly (no build step), restarts on failure, and logs
to `/var/log/baileys-bridge/baileys-bridge.log`. `setup.sh` also installs a
passwordless sudoers rule so the service can be restarted non-interactively (needed
for continuous deploy below).

### Continuous deploy

Once `deploy/setup.sh` has run and the self-hosted runner is registered (see
`deploy/runner-setup.md`, one-time setup), every push to `master` touching
`Bridge/**` (excluding doc-only changes) automatically pulls, reinstalls
dependencies, and restarts the service via `.github/workflows/deploy.yml` — with a
Pushover notification on success or failure.
