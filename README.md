# بنك الحظ (Bank El Hazz)

Real-time multiplayer property game, up to 6 players. Monorepo with three
packages sharing one source of truth for the rules.

---

## 1. Downloading the dependencies (do this first)

You need **Node.js 22 or newer** installed on your computer. Check with:
```bash
node -v
```
If that command isn't found, install it from [nodejs.org](https://nodejs.org)
(get the LTS version) first.

Then, from the root of this project (the folder that directly contains
this README and `package.json`), run:
```bash
npm install
```
This single command reads all three `package.json` files below
(`packages/engine`, `apps/server`, `apps/web`) and installs everything
they each need — React, Vite, Socket.io, Fastify, TypeScript, esbuild,
all of it — into one shared `node_modules` folder. You only need to run
this once, or again whenever you pull new code that added a dependency.

> ⚠️ **Never zip or share your `node_modules` folder.** This project uses
> npm workspaces, which links `packages/engine` into `node_modules` via a
> symlink. Symlinks frequently don't survive being zipped and
> re-extracted (especially across operating systems), and a broken link
> here causes the server to crash immediately with `Cannot find package
> '@bank-el-hazz/engine'`. If you ever need to share this project (with
> me or anyone else), delete `node_modules` first — it's safe, it's
> never part of what I hand you, and `npm install` rebuilds it correctly
> every time.

---

## 2. Architecture — what's where

```
bank-el-hazz/
├── package.json                  npm workspaces root (this is what "npm install" reads)
├── .gitignore
│
├── packages/
│   └── engine/                   PURE GAME RULES — no React, no Socket.io, no HTML
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── types.ts          GameState, Player, Tile, GameAction — the shared vocabulary
│           ├── board.ts          the 40 tiles, property groups, حظ/فرصة card pools
│           ├── colors.ts         the 6 player colors + auto-assignment logic
│           ├── rules.ts          applyAction() — rent, monopoly, bankruptcy, blocking, turns
│           └── index.ts          re-exports everything above
│
└── apps/
    ├── server/                   Node + Fastify + Socket.io — the only thing that trusts the engine
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── index.ts          process startup and graceful shutdown
    │       ├── server.ts         Fastify, Socket.io, validation, static site, connection handling
    │       ├── rooms.ts          room rules, public identities, reconnect and forfeit handling
    │       └── store.ts          in-memory development store + Redis production store
    │
    └── web/                      React + TypeScript (Vite)
        ├── package.json
        ├── vite.config.ts
        ├── index.html
        ├── public/
        │   └── assets/           ← YOUR IMAGES GO HERE (logo, avatars, icons — see section 4)
        └── src/
            ├── main.tsx           app entry, loads the stylesheets
            ├── App.tsx            top-level routing: resuming screen ↔ Landing ↔ Room
            ├── socket.ts          the one file that opens the Socket.io connection
            ├── lib/
            │   └── identity.ts    the persistent player token + nickname (localStorage)
            ├── hooks/
            │   └── useGameSocket.ts   subscribes to server state, exposes dispatch(), auto-resume
            ├── pages/
            │   ├── Landing.tsx    logo, nickname, create/join
            │   ├── Room.tsx       lobby: room code, player list, host "start game"
            │   └── GameScreen.tsx the actual in-game screen — board, dice, panels, modals
            ├── components/        RENDER ONLY — no game math allowed in here
            │   ├── Board.tsx
            │   ├── Tile.tsx
            │   ├── PlayerStrip.tsx
            │   ├── ColorSwatchGrid.tsx    color picker, used inline in the lobby
            │   ├── PropertiesPanel.tsx    your properties + build houses/hotels
            │   ├── StatsPanel.tsx         net worth comparison
            │   └── modals/
            │       ├── BuyModal.tsx
            │       ├── EventModal.tsx
            │       ├── RentModal.tsx
            │       ├── BankruptModal.tsx
            │       └── BlockModal.tsx
            └── styles/
                ├── theme.css      landing/lobby/character-picker styling
                └── board.css      in-game board/modal/panel styling
```

**The separation that matters:** `packages/engine/src/rules.ts` has zero
knowledge that React or Socket.io exist. `apps/web/src/components/*.tsx`
have zero game logic — they just render whatever `GameState` they're
handed and call `dispatch()` on clicks. `apps/server` is the only place
`rules.ts` actually gets called and trusted. Change a rule → touch one
file. Restyle something → touch a different file. Neither touches the
other.

---

## 3. Running it locally

```bash
# terminal 1
npm run dev:server   # http://localhost:4000

# terminal 2
npm run dev:web       # http://localhost:5173
```

Both need to be running at the same time. Open http://localhost:5173 in
two browser tabs (or two devices on the same network) to test real
multiplayer.

---

## 4. Adding your images

Drop any PNG/SVG into `apps/web/public/assets/` and reference it as
`/assets/<filename>` in any component — no build step, no imports needed,
no restart required. The landing page logo already looks for
`apps/web/public/assets/logo.png`.

---

## 5. Where to change things

| I want to change...                    | Edit this file                                        |
|------------------------------------------|--------------------------------------------------------|
| A game rule (rent, prices, bankruptcy)  | `packages/engine/src/rules.ts` or `board.ts`           |
| The 6 player colors                      | `packages/engine/src/colors.ts`                        |
| The nickname / room-join screen          | `apps/web/src/pages/Landing.tsx`                       |
| The color picker (now in the lobby)      | `apps/web/src/components/ColorSwatchGrid.tsx`          |
| The lobby screen                         | `apps/web/src/pages/Room.tsx`                          |
| The in-game screen layout                | `apps/web/src/pages/GameScreen.tsx`                    |
| The board / tiles / dice                 | `apps/web/src/components/Board.tsx`, `Tile.tsx`        |
| Build-houses panel                       | `apps/web/src/components/PropertiesPanel.tsx`          |
| Net worth / stats panel                  | `apps/web/src/components/StatsPanel.tsx`               |
| Any popup (buy/rent/event/etc.)          | `apps/web/src/components/modals/`                      |
| Colors / fonts / spacing                 | `apps/web/src/styles/theme.css` and `board.css`        |
| Images / logo                            | `apps/web/public/assets/`                               |
| Reconnect grace period, room/token logic | `apps/server/src/rooms.ts`                              |
| Server/socket event wiring               | `apps/server/src/server.ts`                             |

---

## 6. Deploy it online (so strangers can reach it)

Production uses one Render web service for React, Fastify, and Socket.IO,
plus one persistent Render Key Value instance for active games. The complete
setup is declared in `render.yaml`.

1. Push the repository to GitHub.
2. In Render, choose **New → Blueprint** and connect the repository.
3. Approve the web service and Key Value resources from `render.yaml`.
4. Wait for the GitHub `CI` check. Render is configured with
   `autoDeployTrigger: checksPass`, so a failed check cannot deploy.
5. Open the generated `onrender.com` URL on two devices and create/join a
   room.

The paid Key Value plan is intentional: it enables disk-backed persistence.
The production server refuses to start without `REDIS_URL`, preventing an
accidental deployment that silently loses active matches. Room state expires
24 hours after the latest update.

Before pushing, run the same release gate locally:

```bash
npm run check
```

For local development, Redis is optional and the server uses an in-memory
store. Copy `.env.example` when testing with a local Redis-compatible server.

---

## 7. Status

✅ **Finished and verified** (not just written — each of these was tested
with a real scripted multiplayer client, not assumed):
- Room create/join, lobby sync, up to 6 players, automatic color-conflict
  resolution
- Server-authoritative turn loop: roll → move → buy/rent/event →
  bankruptcy → win
- Real board UI: tiles, dice (with a roll animation), player tokens
- All 5 modals (buy/event/rent/bankrupt/block), now visible to every
  player live — not just the one acting — so spectating a friend's turn
  actually shows what's happening instead of a static "waiting" message
- Properties panel with working "build house/hotel" buttons
- Stats panel with net worth ranking
- **Secure reconnect handling**: a private credential survives page refreshes
  while a separate public player ID is broadcast to opponents. Disconnect
  mid-game and reconnect within
  60 seconds → your seat, coins, and properties are exactly as you left
  them. Don't come back in time → you're auto-forfeited so the game isn't
  stuck waiting forever. Both paths tested directly, including forcing
  the timeout to actually fire.
- **Color selection moved into the lobby** (not before joining) — you can
  now see everyone else's color live before picking your own, and the
  server rejects picking a color someone already has while allowing a
  switch to any free one. Tested directly: default auto-assignment,
  rejection of a taken color, and a successful switch all confirmed.
- **Escape hatches for stale sessions**: a finished game now automatically
  forgets itself (never auto-resumes into a game that already ended), and
  there's now a real 🚪 exit button in both the lobby and the in-game
  screen — no more needing to manually clear browser storage to start
  fresh if the server has been running for a while.
- **Fixed: two tabs in the same browser now work as two separate
  players again.** The player token moved from `localStorage` (shared
  across every tab of a browser) to `sessionStorage` (scoped to one tab).
  This was a real regression introduced by the reconnect feature — two
  tabs used to be two independent players before tokens existed, then
  silently became "the same player" once the token was added. A page
  refresh within one tab still keeps working for reconnect; a new tab
  correctly gets its own identity now, same as a different person
  joining.
- **Production persistence and safety**: active rooms use Redis-compatible
  storage with a sliding TTL; actions are bound to the connected socket;
  payloads, nicknames, origins, room counts, and event rates are validated.
- **Single-origin production build**: root-level `npm run build` builds React
  and Fastify, and `npm start` serves the website and Socket.IO together.
- **Automated release gate**: GitHub Actions type-checks, tests, audits, and
  builds every change. Render only deploys `main` after those checks pass.

⏳ **Not built yet:**
- Actually deployed online (code is deploy-ready — see section 6 — but
  nothing is live until you run those steps)
- AI opponents (intentionally shelved — can revisit later)
- Ads (AdSense/AdMob) — waits until there's a live site with real traffic
- Expo mobile app — reuses `packages/engine` unchanged once the web UI
  is fully settled
