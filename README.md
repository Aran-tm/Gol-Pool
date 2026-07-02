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
- [x] RLS on all 6 Supabase tables with correct policies; every write goes through signature-verified `wallet-write` Edge Function
- [x] Zero secrets leaked to the client
- [x] API error handling — try/catch + visible error banners
- [x] Mobile-first layout (`max-w-md` container on all 11 pages)
- [x] Favicon
- [x] Clean commit history
- [x] Technical README (architecture, stack, scoring, TxLINE endpoints, feedback)

### 🔴 Critical — blocks launch or disqualifies (2)
- [x] **Demo video ≤5 min** — recorded (7min raw via Bandicam), editing down in CapCut now
- [ ] **Submit on Superteam Earn** — ready to go once video is uploaded
- [ ] **Confirm on a real phone** — mobile wallet-connect logic was reworked (`src/solana/mobile.ts` now checks for a truly-injected provider, not just adapter `readyState`); needs one real-device pass before judges click the link

### 🟡 High — weighs heavily on scoring (2)
- [x] React error boundary — `src/components/ErrorBoundary.tsx`, mounted in `main.tsx`; a render crash now shows a recovery screen instead of blank white
- [x] Open Graph / Twitter meta tags — added to `index.html` (title, description, url, site_name, image, twitter:card)

### 🟠 Medium (1)
- [x] Lighthouse risk — `App.tsx` now lazy-loads every route behind the wallet gate (`React.lazy` + one `Suspense` boundary). Landing/Onboarding stay eager. Confirmed via `npm run build`: Dashboard/Pools/Profile/MatchDetail/PoolDetail/Setup/HowToPlay/MatchCenter are now separate 2–35KB chunks loaded on demand, instead of baked into the single startup bundle.

### ⚪ Nice to have (7)
- [x] Analytics (`@vercel/analytics`) — installed, `<Analytics />` mounted in `main.tsx`
- [x] PWA basics — `public/manifest.json`, `apple-touch-icon.png` + `icon-192/512.png` generated from `favicon.svg`, linked in `index.html`
- [x] `VITE_SOLANA_NETWORK` — removed from `.env.example`; it was undocumented-but-unused (network is intentionally hardcoded to `mainnet` in `WalletContext.tsx`, not meant to be configurable)
- [x] Visual polish (flags) — re-audited: Dashboard/MatchCenter already show flags via `<MatchCard>`, Pools.tsx never renders team names. No gap found; only the live goal-celebration confetti (see below) is still open.
- [x] Goal celebration animation — `MatchDetail` now fires a green/gold confetti burst once per goal that lands while you're watching (diffs new vs. already-seen goals via a ref; respects `prefers-reduced-motion`). Reveal/champion/pool-lock celebrations unchanged.
- [x] Load testing — see "Load & capacity" below. The public deploy sits behind Vercel edge bot-protection (403s all synthetic/non-browser traffic), so external HTTP load testing isn't representative; capacity rests on Vercel's CDN + Supabase's managed scaling, both well past a friends-sweepstake's needs.
- [x] Social push — X/Twitter launch thread drafted (6 tweets + image slots); ready to post once the demo video is live. Not committed to the repo (marketing copy).
- [x] `score_log` — dropped. Points are derived live client-side (`src/lib/scoring.ts`); the table was never read or written. Removed from `schema.sql`/`policies.sql`; run `supabase/drop_score_log.sql` once to clear it from the live DB. A per-pool ledger is a deliberate future step (entry-fee payouts), not MVP.

---

## 🚀 What's left (1 blocking, then ship)

**Demo video** — ✅ recorded (Bandicam), edited (CapCut), live at [youtu.be/NCWtsdOpa3E](https://youtu.be/NCWtsdOpa3E). Real-device mobile check ✅ passed.

**Submit on Superteam Earn** (the only remaining blocker)
- [ ] Go to the hackathon submission form on Superteam Earn (TxODDS World Cup)
- [ ] Fill in: project title, description (use pitch in "Pitch para el formulario" section of this README)
- [ ] Attach: [repo](https://github.com/Aran-tm/Gol-Pool) · [live deploy](https://gol-pool.vercel.app) · [demo video](https://youtu.be/NCWtsdOpa3E)
- [ ] Copy the TxLINE feedback from the "TxLINE feedback" section below
- [ ] Submit before **2026-07-19 23:59 UTC**

---

## 📈 Load & capacity

Load testing was attempted with `npx autocannon` against the live deploy. Finding: the public URL is shielded by Vercel's edge bot-protection and returns **403 to all non-browser / synthetic traffic** (curl and autocannon alike, even with a browser User-Agent — it requires solving a JS/cookie challenge that real browsers pass transparently). So external HTTP load testing isn't representative and wasn't forced past that control.

Capacity therefore rests on two managed layers, both far above this app's target (friends running a sweepstake, not a public launch):
- **Frontend** — static bundle on Vercel's global CDN (now route-split, ~285KB gzip initial JS).
- **Data** — Supabase (managed Postgres + connection pooling + Realtime), which handles its own scaling and rate limits.

Reproduce: `npx autocannon -c 5 -d 10 https://gol-pool.vercel.app` (expect 403s — that's the edge protection, not the app).

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
│  matches · match_events · profiles                │
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
**Demo video:** [youtu.be/NCWtsdOpa3E](https://youtu.be/NCWtsdOpa3E)
**TxLINE feedback:** copy from the section below ↓

---

## 🗣️ TxLINE feedback (for submission)
What worked: the on-chain subscribe → activate flow is genuinely nice — no API key request form, no waiting on a human. `GET /api/fixtures/snapshot` and `GET /api/scores/snapshot/{fixtureId}` were enough to build a real product on a simple polling loop.

Friction we hit:
- **No on-demand "live" or "finished" state for testing/demos.** The World Cup feed (`competitionId=72`) only returns fixtures as `Not Started` until their real kickoff, and `asOf` doesn't replay a fixture that never actually played out in the feed. We ended up building our own synthetic replay (`worker/replay.ts`) to develop and record a demo without waiting on the real match calendar. An official sandbox/replay mode would save every team building a live-scores product the same detour.
- **CORS blocks calling `/api/token/activate` directly from the browser.** We had to move activation to a server-side script (`worker/activate.ts`) instead of the client.
- **`/api/token/activate` sometimes returns the token as plain text, not JSON** — we handle both (`JSON.parse` with a plain-text fallback).
- **`StartTime` is in milliseconds**, not seconds — not obvious from the docs and an easy off-by-1000 trap for a first-time integrator.
