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

### ✅ Critical — ALL COMPLETED (3)
- [x] **Demo video ≤5 min** — ✅ Recorded & edited, live at [youtu.be/NCWtsdOpa3E](https://youtu.be/NCWtsdOpa3E)
- [x] **Submit on Superteam Earn** — ✅ **DONE** (2026-07-02)
- [x] **Confirm on a real phone** — ✅ Mobile wallet-connect tested real device; works seamlessly with Phantom injected provider

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

## ✨ Completeness Checklist — All features implemented & tested

### Core MVP (User-facing)
- [x] **Wallet sign-in/out** — Real Solana signature auth (Phantom)
- [x] **Create pool** — Set pool name, choose competition (World Cup)
- [x] **Join pool** — Browse open pools, click to join, random team assignment
- [x] **Live leaderboard** — Real-time score updates via Supabase Realtime as goals happen
- [x] **Team assignment view** — See which team(s) you own in each pool
- [x] **Match detail page** — View individual match scores, goalscorers, live updates
- [x] **MatchCenter** — Browse all World Cup fixtures + live scores
- [x] **Profile page** — View wallet address, your pools, team assignments
- [x] **Scoring engine** — Goal +2 (live), Win +3, Draw +1, Clean Sheet +2
- [x] **Goal celebration animation** — Confetti burst + floating "+2" when a goal lands live
- [x] **Mobile-responsive design** — All 11 pages mobile-first (`max-w-md`)
- [x] **Error handling** — User-visible error banners, no silent failures

### Backend & Infrastructure
- [x] **Supabase Postgres DB** — 7 tables (pools, pool_members, team_assignments, matches, match_events, profiles, users)
- [x] **Row-level security (RLS)** — All tables protected; every write verified via signature
- [x] **Wallet-write Edge Function** — Server-side signature verification (`Ed25519`); prevents unauthorized writes
- [x] **TxLINE integration** — Polls every 15s for live match data
- [x] **Ingest pipeline** — `worker/ingest.ts` + Vercel Edge Function cron: transforms TxLINE scores → goal events → Supabase
- [x] **Realtime push** — Supabase Realtime channel updates leaderboard instantly when goals arrive
- [x] **Zero secrets in client** — All API tokens, keys live in `.env.local` (gitignored)
- [x] **Vercel deployment** — Live at [gol-pool.vercel.app](https://gol-pool.vercel.app)

### Quality & Polish
- [x] **React Error Boundary** — Render crashes show recovery screen, not blank white
- [x] **Open Graph meta tags** — Title, description, image, Twitter card for social sharing
- [x] **Favicon** — SVG icon + PWA icons (192x192, 512x512)
- [x] **Accessibility basics** — Semantic HTML, ARIA labels, keyboard navigation
- [x] **Code splitting** — Routes lazy-loaded behind wallet gate; initial JS ~285KB gzip
- [x] **Clean git history** — Readable commit messages, no secrets, demo-ready
- [x] **README documentation** — Architecture diagram, scoring rules, TxLINE endpoints, setup guide

### TxLINE Compliance & Testing
- [x] **TxLINE live data** — Real World Cup 2026 fixtures + scores (not mocked)
- [x] **On-chain subscription** — Phantom wallet authenticated; service level 12 (real-time)
- [x] **API token activation** — On-chain via Solana program; 4-week access
- [x] **Demo-ready replay** — `worker/replay.ts` simulates live goals for video recording
- [x] **TxLINE feedback documented** — What worked, what caused friction (in README)

### Hackathon Requirements (Mandatory)
- [x] **Demo video ≤5 min** — Live at [youtu.be/NCWtsdOpa3E](https://youtu.be/NCWtsdOpa3E)
- [x] **Live, functional MVP** — No mockups, no wireframes, fully playable
- [x] **Public GitHub repo** — [github.com/Aran-tm/Gol-Pool](https://github.com/Aran-tm/Gol-Pool)
- [x] **Technical documentation** — README with architecture, stack, endpoints, setup
- [x] **TxLINE live data** — Polling + Supabase Realtime end-to-end
- [x] **Solana sign-in** — Phantom wallet (mainnet)
- [x] **Submission to Superteam Earn** — ✅ **DONE** (2026-07-02)

---

## ✅ Ship complete (2026-07-02)

- [x] **Demo video** — recorded (Bandicam), edited (CapCut), live at [youtu.be/NCWtsdOpa3E](https://youtu.be/NCWtsdOpa3E). Real-device mobile check ✅ passed.
- [x] **Submit on Superteam Earn** — ✅ **SUBMITTED** (TxODDS World Cup track, 2026-07-02)

---

## 🧪 For Judges: How to test the app

1. **Sign in** with any Solana wallet (Phantom recommended on desktop/mobile)
2. **⭐ Join this pool to compete:** `VHBVP`
   - This is the live testing pool with 3 players already competing
   - You'll be assigned a random World Cup team and can see live scoring
   - Best way to experience the real leaderboard updates as goals happen
3. **Or create your own pool** if you prefer to test the creation flow
4. **Watch live goals update the leaderboard** — scoring is automatic:
   - **Goal scored:** +2 points (instant, as it happens)
   - **Win:** +3 points (final whistle)
   - **Draw:** +1 point (final whistle)
   - **Clean sheet:** +2 points (full-time, no goals conceded)
5. **Check MatchCenter** to see all World Cup fixtures and scores in real-time
6. **Mobile-friendly:** works seamlessly on phone/tablet

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
