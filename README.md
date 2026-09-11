# بنك الحظ (Bank El Hazz)

Real-time multiplayer property game, up to 6 players. Monorepo with three
packages sharing one source of truth for the rules.

---

## 1. Downloading the dependencies (do this first)

You need **Node.js 18 or newer** installed on your computer. Check with:
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
    │       ├── index.ts          boots the server, wires up all socket events, disconnect handling
    │       └── rooms.ts          room codes, player tokens, color assignment, reconnect grace timers
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
| Server/socket event wiring               | `apps/server/src/index.ts`                              |

---

## 6. Deploy it online (so strangers can reach it)

We use Render (render.com) — free, no credit card, supports the WebSocket
connections Socket.io needs. Free tier sleeps after 15 minutes of no
traffic (30–60s cold start on the next visit); Render's Starter plan
($7/month) removes that if/when you want strangers landing on it, not
just friends who'll wait it out.

### 0. Push this project to GitHub first
Render deploys from a Git repo, not a zip file.
```bash
git init
git add .
git commit -m "بنك الحظ - initial deploy"
```
Then create a new repo on github.com and follow its "push an existing
repository" instructions.

### 1. Deploy the server (Web Service)
On Render: New → Web Service → connect your GitHub repo.
- **Root Directory**: `apps/server`
- **Build Command**: `cd ../.. && npm install && npm run build --workspace=@bank-el-hazz/server`
- **Start Command**: `npm run start`
- **Environment Variable**: `WEB_ORIGIN` = (leave blank for now, set in step 3)

Deploy. Copy its URL — looks like `https://bank-el-hazz-server.onrender.com`.

### 2. Deploy the website (Static Site)
On Render: New → Static Site → same GitHub repo.
- **Root Directory**: `apps/web`
- **Build Command**: `cd ../.. && npm install && npm run build --workspace=@bank-el-hazz/web`
- **Publish Directory**: `dist`
- **Environment Variable**: `VITE_SERVER_URL` = the server URL from step 1

Deploy. Copy this site's URL too.

### 3. Wire them together
Server's Render dashboard → Environment → set `WEB_ORIGIN` = the website
URL from step 2. Save (triggers a redeploy).

### 4. Test it
Open the website URL on your phone and your laptop — create a room on
one, join with the code on the other.

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
- **Reconnect handling**: a stable player token (not the ephemeral socket
  id) survives page refreshes. Disconnect mid-game and reconnect within
  60 seconds → your seat, coins, and properties are exactly as you left
  them. Don't come back in time → you're auto-forfeited so the game isn't
  stuck waiting forever. Both paths tested directly, including forcing
  the timeout to actually fire.
- **Color selection moved into the lobby** (not before joining) — you can
  now see everyone else's color live before picking your own, and the
  server rejects picking a color someone already has while allowing a
  switch to any free one. Tested directly: default auto-assignment,
  rejection of a taken color, and a successful switch all confirmed.
- **Deploy-ready for hosts without monorepo root-directory support**
  (like Bonto): root-level `npm run build` / `npm run start` now target
  the server directly, tested by literally running that exact sequence
  from the repo root standalone.
- Production server bundle verified standalone (`npm run build` + `npm
  run start`, no dev tools at runtime) under the full test suite

⏳ **Not built yet:**
- Actually deployed online (code is deploy-ready — see section 6 — but
  nothing is live until you run those steps)
- AI opponents (intentionally shelved — can revisit later)
- Ads (AdSense/AdMob) — waits until there's a live site with real traffic
- Expo mobile app — reuses `packages/engine` unchanged once the web UI
  is fully settled
