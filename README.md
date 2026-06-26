<div align="center">

# ⚽ GolPool

### The live World Cup sweepstake that scores itself.

Create a pool with friends → get teams assigned → watch the leaderboard update **live** as goals happen.
Powered by **TxLINE** real-time data · Sign in with **Solana**.

`React + TypeScript + Vite` · `Tailwind` · `Supabase` · `Solana` · `TxLINE`

**Hackathon:** TxODDS — Consumer & Fan Experiences (World Cup Track) · **Deadline:** 2026-07-19

</div>

---

## 🎯 The idea
Friends join a pool, each is randomly assigned World Cup teams, and the leaderboard updates **automatically in real time** from live match data — no more manual spreadsheets. Every goal moves the table.

---

## 📊 Project status (live guide)

### ✅ Done
- [x] Project scaffold — React + TS + Vite + Tailwind
- [x] **Solana sign-up** — Phantom wallet adapter + in-app TxLINE subscription (on-chain)
- [x] **TxLINE access** — on-chain subscription + API token activated (free real-time tier, service level 12)
- [x] **TxLINE client** — fixtures, score snapshots, SSE types (`src/lib/txline.ts`)
- [x] World Cup data confirmed — `competitionId = 72`, 19 live fixtures synced
- [x] **Supabase** — schema (7 tables), RLS policies, Realtime enabled
- [x] **Ingestion worker** — syncs fixtures + polls live scores → Supabase (`worker/ingest.ts`)
- [x] **App** — wallet sign-in, create/join pool, random team assignment, **live leaderboard** with Realtime
- [x] Scoring engine — +2 goal / +3 win / +1 draw / +2 clean sheet (`src/lib/scoring.ts`)

### 🚧 In progress
- [ ] **Premium UI/UX overhaul** — framer-motion animations, animated SVGs, unique brand design
- [ ] App icon / favicon ✅ (updated)

### ⬜ To do (to win)
- [ ] **Demo replay mode** — replay a finished match so the leaderboard moves live on camera (matches end before judging)
- [ ] **Country flags & team visuals** in the leaderboard
- [ ] **Goal celebration** animations (confetti + toast when your team scores)
- [ ] **Deploy to Vercel** (public link — submission requirement)
- [ ] **Host the worker** (Railway/Render) or run locally during the demo
- [ ] **On-chain entry fees / prize pot** (monetization differentiator — optional but strong)
- [ ] **Demo video ≤5 min** (absolute requirement)
- [ ] **Technical documentation** for submission (idea, highlights, endpoints, TxLINE feedback)
- [ ] Polish — loading/empty/error states, even team distribution, all 104 fixtures
- [ ] Harden RLS before any public launch

---

## 🏗️ Architecture

```
┌───────────────────────────────────────────────┐
│  Browser — React + TS + Vite + Tailwind        │
│  • Phantom (Solana) sign-in                     │
│  • Supabase Realtime → live leaderboard         │
└───────────────▲─────────────────┬──────────────┘
                │ realtime push    │ REST
                │                  ▼
┌───────────────┴──────────────────────────────────┐
│  Supabase (Postgres + Realtime)                   │
│  pools · pool_members · team_assignments ·        │
│  matches · match_events · score_log · profiles    │
└───────────────▲───────────────────────────────────┘
                │ writes match state + goal events
┌───────────────┴──────────────────────────────────┐
│  Ingestion worker (Node/tsx) — worker/ingest.ts   │
│  polls TxLINE → upserts matches → goal events     │
└───────────────▲───────────────────────────────────┘
                │ live World Cup data
            ┌───┴────┐
            │ TxLINE │  scores · fixtures · odds (104 games)
            └────────┘
```

## 🧮 Scoring (`src/lib/scoring.ts`)
Per assigned team, accruing live:
- **Goal scored:** +2 (live — the exciting moment)
- **Win:** +3 · **Draw:** +1 (on full-time)
- **Clean sheet:** +2 (on full-time)

## 🔌 TxLINE endpoints used
- `POST /auth/guest/start` — guest JWT
- on-chain `subscribe(serviceLevel, weeks)` + `POST /api/token/activate` — API token
- `GET /api/fixtures/snapshot?competitionId=72` — World Cup matches
- `GET /api/scores/snapshot/{fixtureId}` — current/historical score
- `GET /api/scores/stream` — real-time SSE (next: wire into worker)

## 💰 Monetization
On-chain entry-fee pools (winner takes pot, platform rake) · premium pools (more teams, custom scoring) · sponsored/branded pools · cosmetics.

---

## 🚀 Local setup

```bash
npm install
```

Create `.env.local` (see `.env.example`):
```
TXLINE_NETWORK=mainnet
TXLINE_API_TOKEN=...          # from the in-app Setup flow
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=... # worker only
```

1. **Supabase:** run `supabase/schema.sql` then `supabase/policies.sql` in the SQL Editor.
2. **Get the TxLINE token:** `npm run dev` → open the app → ⚙️ Setup → connect Phantom → subscribe + activate.
3. **Populate live data:** `npm run txline:ingest -- --watch`
4. **Run the app:** `npm run dev`

### Scripts
| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run txline:fixtures` | List World Cup fixtures + competitionId |
| `npm run txline:scores` | Show current state/score of every match |
| `npm run txline:ingest [-- --watch]` | Sync matches + live scores → Supabase |

## 📁 Structure
```
golpool/
├── src/
│   ├── lib/        txline.ts · supabase.ts · subscribe.ts · api.ts · scoring.ts · txlineConfig.ts
│   ├── pages/      Setup.tsx · Pools.tsx · PoolDetail.tsx
│   ├── solana/     WalletContext.tsx
│   └── App.tsx
├── worker/         subscribe · fixtures · scores · ingest · activate (helpers)
├── supabase/       schema.sql · policies.sql
└── public/         favicon.svg
```

## 🗣️ TxLINE feedback (for submission)
> Filled in as we build — what worked, where we hit friction (e.g. CORS from the browser, `StartTime` in ms vs the docs' seconds, plain-text token response).
