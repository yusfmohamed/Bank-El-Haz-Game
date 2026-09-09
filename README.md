# بنك الحظ (Bank El Hazz)

Real-time multiplayer property game. Monorepo with three packages sharing
one source of truth for the rules.

## Structure

- `packages/engine` — pure game rules (TypeScript, no UI/server deps)
- `apps/server` — Fastify + Socket.io, the only thing that trusts the engine
- `apps/web` — React + Vite, renders state and dispatches actions

## Run it locally

```bash
npm install          # installs all three workspaces at once

# terminal 1
npm run dev:server   # http://localhost:4000

# terminal 2
npm run dev:web       # http://localhost:5173
```

Open http://localhost:5173 in two browser tabs (or two devices on the same
network) to test real multiplayer — one creates a room, the other joins
with the 5-letter code.

## Add your images

Drop any PNG/SVG into `apps/web/public/assets/` and reference it as
`/assets/<filename>` in any component — no build step, no imports needed.
The landing page logo already looks for `apps/web/public/assets/logo.png`.

## Where to change things

| I want to change...              | Edit this file                                  |
|-----------------------------------|--------------------------------------------------|
| A game rule (rent, prices, bankruptcy) | `packages/engine/src/rules.ts` or `board.ts` |
| The nickname / room-join screen  | `apps/web/src/pages/Landing.tsx`                |
| The lobby screen                 | `apps/web/src/pages/Room.tsx`                   |
| Colors / fonts / spacing         | `apps/web/src/styles/theme.css`                 |
| Images / logo                    | `apps/web/public/assets/`                       |
| Server/room behavior              | `apps/server/src/rooms.ts` or `index.ts`        |

## Status

✅ Room create/join, lobby sync, server-authoritative turn loop (roll →
move → buy/rent/event → bankruptcy → win), all tested end-to-end over real
sockets.

⏳ Not built yet: the actual board UI (tiles/dice/modals) in `apps/web` —
right now the in-game screen is a placeholder that proves the connection
and state sync work. That's next.
