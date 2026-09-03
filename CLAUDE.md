# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The contributor and AI-agent guide lives in **[AGENTS.md](AGENTS.md)** — start there. It covers repo layout, setup, daily commands, code style, commit conventions, and what not to touch.

For AI authorship disclosure rules and the broader AI policy, see **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** § AI Policy.

For security-sensitive changes and vulnerability disclosure, see **[SECURITY.md](SECURITY.md)**.

## Running a single test

```bash
node --experimental-vm-modules ./node_modules/.bin/jest src/__tests__/Utils/decode-wa-message.test.ts
node --experimental-vm-modules ./node_modules/.bin/jest -t 'name of the it() block'
```

Jest runs ESM directly against `.ts` sources via `ts-jest` (see `jest.config.ts`) — no separate build step needed before testing.

## Socket architecture: layered mixins, not classes

`makeWASocket` (`src/Socket/index.ts`) is the bottom of a chain of factory functions, each wrapping the previous one and spreading its return value to add more methods. There is no class hierarchy — this is why a single feature (e.g. "send a message") can require reading several files to trace end to end. The composition order, outermost to innermost:

```
makeWASocket (Socket/index.ts)
  → makeCommunitiesSocket   (communities.ts)
    → makeBusinessSocket    (business.ts)
      → makeMessagesRecvSocket (messages-recv.ts)  — incoming stanza handling, decryption, event emission
        → makeMessagesSocket   (messages-send.ts)  — outgoing message composition/encryption
          → makeNewsletterSocket (newsletter.ts)
            → makeGroupsSocket    (groups.ts)
              → makeChatsSocket     (chats.ts)
                → makeSocket          (socket.ts)  — base layer: WebSocket, Noise handshake, auth, generic query()
```

Each `make*Socket(config)` calls the next-inner factory, destructures its result, and returns `{ ...innerSock, myNewMethod, ... }`. When adding a method that needs something from an inner layer (e.g. `query`, `ws`, `authState`), add it to the layer that already has access rather than threading new params through every layer above it. When tracing a bug, start at `socket.ts` (the WS/Noise/auth primitives and the `CB:` event router) and walk outward through the layer that owns the feature.
