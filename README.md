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

## 📊 Project status (audited 2026-07-02)
> Checked against the actual code, not against intentions — full evidence trail (file:line) lives in the 2026-07-02 audit report. This replaces the old self-reported checklist, which had drifted out of date since 2026-06-26.

### ✅ Done (12)
- [x] Wallet sign-in/out — real signature auth (`signMessage`), verified server-side, not just a trusted client address
- [x] Continuous TxLINE ingestion (`worker/ingest.ts`, `--watch`, polls every 15s)
- [x] Full flow: create pool → join → team assignment → live leaderboard — no stubs
- [x] Scoring engine wired end-to-end (+2 goal / +3 win / +1 draw / +2 clean sheet)
- [x] Synthetic replay for demo recording (`worker/replay.ts`)
- [x] RLS on all 7 Supabase tables with correct policies; every write goes through the signature-verified `wallet-write` Edge Function, not raw client writes
- [x] Zero secrets leaked to the client (`SUPABASE_SERVICE_ROLE_KEY` never appears in `src/`)
- [x] API error handling — try/catch + visible error banners across Pools/PoolDetail/Dashboard
- [x] Mobile-first layout (`max-w-md` container on all 11 pages, real touch swipe via framer-motion)
- [x] Favicon
- [x] Clean commit history
- [x] Technical README (architecture, stack, scoring, TxLINE endpoints used)

### 🔴 Critical — blocks launch or disqualifies (6)
- [ ] **Deploy to Vercel** — not done yet
- [ ] **Make the GitHub repo public** — currently 404s on the public API (likely private); the hackathon requires a public repo
- [ ] **24/7 ingestion without a laptop running** — the `ingest` Edge Function is written (deploy + cron documented below and in `supabase/functions/ingest/README.md`) but not confirmed deployed/scheduled on the real project yet
- [ ] **Demo video ≤5 min** — not recorded
- [ ] **Refresh submission docs** — TxLINE feedback filled in below; keep this status section current from here on
- [ ] **Submit on Superteam Earn**

### 🟡 High — weighs heavily on scoring (4)
- [ ] No React error boundary — a render error currently shows a blank white screen with no recovery
- [ ] No Open Graph meta tags (`og:title`, `og:image`, …) — link previews on Discord/Twitter render empty
- [ ] Lighthouse risk — production bundle is 1.1MB JS + 452KB CSS in a single chunk, no route-based code-splitting
- [ ] Real device testing (iPhone/Android) still pending

### ⚪ Nice to have (7)
- [ ] Analytics (`@vercel/analytics`)
- [ ] PWA basics (`manifest.json`, `apple-touch-icon`)
- [ ] Load testing
- [ ] Social push (tweet, hackathon Discord)
- [ ] Visual polish — country flags, goal celebration animation (`canvas-confetti` is installed but not wired everywhere)
- [ ] `score_log` table has RLS but nothing writes to it yet
- [ ] `VITE_SOLANA_NETWORK` is documented in `.env.example` but unused — network is hardcoded to `mainnet` in `WalletContext.tsx`

---

## 🔓 Unblocking the 3 infra criticals
These three need an interactive login only you can do — everything else is already prepared so each is a copy/paste job.

**1. Make the repo public**
[github.com/Aran-tm/Gol-Pool/settings](https://github.com/Aran-tm/Gol-Pool/settings) → Danger Zone → Change visibility → Public.
(Full git history was checked — no secrets ever committed, safe to flip.)

**2. Deploy to Vercel** — no CLI needed
[vercel.com/new](https://vercel.com/new) → Import `Aran-tm/Gol-Pool` → framework auto-detects as Vite (`npm run build`, output `dist/`) → add the `VITE_*` env vars from `.env.example` → Deploy.

**3. Deploy + schedule the ingest Edge Function**
```bash
npx supabase login
npx supabase link --project-ref fsikncccjhdauudcnvqs
npx supabase secrets set TXLINE_API_TOKEN=<value from .env.local> TXLINE_NETWORK=mainnet
npx supabase functions deploy ingest --no-verify-jwt
```
Then in the Supabase dashboard → SQL Editor: enable `pg_cron` + `pg_net` (Database → Extensions), then run the `cron.schedule(...)` block from `supabase/functions/ingest/README.md`.

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
What worked: the on-chain subscribe → activate flow is genuinely nice — no API key request form, no waiting on a human. `GET /api/fixtures/snapshot` and `GET /api/scores/snapshot/{fixtureId}` were enough to build a real product on a simple polling loop.

Friction we hit:
- **No on-demand "live" or "finished" state for testing/demos.** The World Cup feed (`competitionId=72`) only returns fixtures as `Not Started` until their real kickoff, and `asOf` doesn't replay a fixture that never actually played out in the feed. We ended up building our own synthetic replay (`worker/replay.ts`) to develop and record a demo without waiting on the real match calendar. An official sandbox/replay mode would save every team building a live-scores product the same detour.
- **CORS blocks calling `/api/token/activate` directly from the browser.** We had to move activation to a server-side script (`worker/activate.ts`) instead of the client.
- **`/api/token/activate` sometimes returns the token as plain text, not JSON** — we handle both (`JSON.parse` with a plain-text fallback).
- **`StartTime` is in milliseconds**, not seconds — not obvious from the docs and an easy off-by-1000 trap for a first-time integrator.
