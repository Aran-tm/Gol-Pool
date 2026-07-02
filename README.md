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

## 📊 Project status (live, 2026-07-02)
> Audited against actual code on 2026-07-02 and verified live on 2026-07-02. This replaces the old self-reported checklist from 2026-06-26.

### ✅ Done (15)
- [x] **GitHub repo public** — verified `"visibility": "public"` via API
- [x] **Deployed to Vercel** — live at [gol-pool.vercel.app](https://gol-pool.vercel.app)
- [x] **24/7 ingestion on-chain** — Edge Function `ingest` deployed and running; last poll: 33 fixtures scanned, 0 live, 0 updates, 11 skipped (cached), 0 failures
- [x] Wallet sign-in/out — real signature auth (`signMessage`), verified server-side
- [x] Continuous TxLINE ingestion (`worker/ingest.ts` + Edge Function, polls every 15s on schedule)
- [x] Full flow: create pool → join → team assignment → live leaderboard — no stubs
- [x] Scoring engine wired end-to-end (+2 goal / +3 win / +1 draw / +2 clean sheet)
- [x] Synthetic replay for demo recording (`worker/replay.ts`)
- [x] RLS on all 7 Supabase tables with correct policies; every write goes through signature-verified `wallet-write` Edge Function
- [x] Zero secrets leaked to the client
- [x] API error handling — try/catch + visible error banners
- [x] Mobile-first layout (`max-w-md` container on all 11 pages)
- [x] Favicon
- [x] Clean commit history
- [x] Technical README (architecture, stack, scoring, TxLINE endpoints, feedback)

### 🔴 Critical — blocks launch or disqualifies (2)
- [ ] **Demo video ≤5 min** — not recorded (use `npm run txline:replay` locally; guión abajo)
- [ ] **Submit on Superteam Earn** — ready to go once video is done

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

## 🚀 What's left (2 blocking, then ship)

**1. Record the demo video** (~20 min of setup + recording)
- [ ] `npm run dev` in one terminal
- [ ] `npm run txline:replay` in another (run this before/during recording to populate live score changes)
- [ ] Capture the leaderboard updating live as the replay runs (goal → +2 animate → podio → champion)
- [ ] Upload to YouTube (unlisted) with the full flow: hook → problem → sign in → create pool → join → team assignment → live replay → TxLINE mention → vision of monetization → close
- [ ] Script at the start of this README, section "Guión para el video"

**2. Submit on Superteam Earn**
- [ ] Go to the hackathon submission form on Superteam Earn (TxODDS World Cup)
- [ ] Fill in: project title, description (use pitch in "Pitch corto para el formulario" section of this README)
- [ ] Attach: link to this repo, link to the live Vercel deploy ([gol-pool.vercel.app](https://gol-pool.vercel.app)), YouTube demo video link
- [ ] Copy the TxLINE feedback from the "TxLINE feedback" section below
- [ ] Submit before **2026-07-19 23:59 UTC**

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

## 💰 Monetization (roadmap — not built yet)
Today every pool is free; wallets are used for identity/sign-up only, no funds ever move. `pools.entry_fee` already exists in the schema (defaults to `0`) as the seam for what's next: on-chain entry-fee pools where the highest score at tournament end takes the pot (winner-takes-all, platform rake), plus premium pools (more teams, custom scoring), sponsored/branded pools, cosmetics. The app's own FAQ (`HowToPlay.tsx`) tells users this directly: *"Is there an entry fee? Not yet."*

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

## 📹 Guión para el video demo (≤5 min)
1. **0:00–0:20** — **Gancho:** leaderboard moviéndose en vivo (gol cayendo, +2 flotante). El efecto primero.
2. **0:20–0:50** — **Problema:** pool de WhatsApp/planilla manual → sin actualización en vivo.
3. **0:50–1:30** — **Sign in:** conectar Phantom (mostrar la firma real, no un mock).
4. **1:30–2:15** — **Crear + unirse:** crear un pool, unirse con otro perfil (otra wallet/navegador), mostrar asignación aleatoria de equipos.
5. **2:15–3:30** — **El corazón:** correr `npm run txline:replay` (podés hacerlo en otra terminal antes y solo mostrar el resultado) → capturar leaderboard actualizándose solo — gol, +2 animado, podio, campeón.
6. **3:30–4:00** — **Cómo funciona:** 15-20 seg mencionando TxLINE (endpoints), suscripción on-chain, Supabase Realtime.
7. **4:00–4:30** — **Visión a futuro:** "Hoy free-to-play, pensado para sumar entry fees on-chain en el futuro" — dejalo claro como roadmap, no como feature activo.
8. **4:30–5:00** — **Cierre:** links → [gol-pool.vercel.app](https://gol-pool.vercel.app), repo, equipo, track.

**Subilo a YouTube como "no listado"** (unlisted) para asegurar el checklist sin comprometerte aún a esa versión — lo pasás a público o re-subís al final si querés pulir.

---

## 📋 Pitch para el formulario de submission (Superteam Earn)
> GolPool turns a World Cup group-stage sweepstake into something that plays itself. Friends connect a Solana wallet, get World Cup teams assigned at random, and watch a leaderboard update in real time as goals happen — no spreadsheet, no manual updates. Powered by TxLINE live match data end-to-end: an ingestion pipeline polls TxLINE and pushes every goal straight into Supabase Realtime. Built as a foundation for on-chain entry-fee pools as the natural next step.

**Repo:** [github.com/Aran-tm/Gol-Pool](https://github.com/Aran-tm/Gol-Pool)
**Live:** [gol-pool.vercel.app](https://gol-pool.vercel.app)
**TxLINE feedback:** copy from the section below ↓

---

## 🗣️ TxLINE feedback (for submission)
What worked: the on-chain subscribe → activate flow is genuinely nice — no API key request form, no waiting on a human. `GET /api/fixtures/snapshot` and `GET /api/scores/snapshot/{fixtureId}` were enough to build a real product on a simple polling loop.

Friction we hit:
- **No on-demand "live" or "finished" state for testing/demos.** The World Cup feed (`competitionId=72`) only returns fixtures as `Not Started` until their real kickoff, and `asOf` doesn't replay a fixture that never actually played out in the feed. We ended up building our own synthetic replay (`worker/replay.ts`) to develop and record a demo without waiting on the real match calendar. An official sandbox/replay mode would save every team building a live-scores product the same detour.
- **CORS blocks calling `/api/token/activate` directly from the browser.** We had to move activation to a server-side script (`worker/activate.ts`) instead of the client.
- **`/api/token/activate` sometimes returns the token as plain text, not JSON** — we handle both (`JSON.parse` with a plain-text fallback).
- **`StartTime` is in milliseconds**, not seconds — not obvious from the docs and an easy off-by-1000 trap for a first-time integrator.
