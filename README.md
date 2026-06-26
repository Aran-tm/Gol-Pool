# ⚽ GolPool — Group Sweepstake for the World Cup

> Real-time World Cup sweepstake. Create a pool with friends, get teams assigned, and watch the leaderboard update **live** as goals happen — powered by **TxLINE** real-time data. Sign in with **Solana**.

**Hackathon:** TxODDS — Consumer & Fan Experiences (World Cup Track) · Superteam Earn
**Deadline:** 2026-07-19 23:59 UTC

---

## 🎯 The idea (one sentence)
Friends join a pool, each is randomly assigned World Cup teams, and the leaderboard updates **automatically in real time** from live match data — no more manual spreadsheets.

## 🧩 Why this wins (mapped to judging criteria)
| Criterion | How GolPool nails it |
|-----------|----------------------|
| **Fan Accessibility & UX** | Mobile-first, 10-second onboarding, zero jargon. Your mom could use it. |
| **Real-Time Responsiveness** | Goal on the pitch → score + leaderboard animate in <2s via TxLINE + Supabase Realtime. |
| **Originality & Value** | Turns passive watching into a live social competition across all 104 games. |
| **Commercial / Monetization** | Entry-fee pools with on-chain prize pots (rake), premium pools, sponsored pools, cosmetics. |
| **Completeness & Execution** | End-to-end: wallet sign-in → create/join pool → live scoring → shareable result. |

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Browser (React + TS + Vite + Tailwind, mobile-first PWA)   │
│  • Solana Wallet Adapter (Phantom) for sign-in              │
│  • Supabase Realtime subscription → live leaderboard        │
└───────────────▲───────────────────────────┬────────────────┘
                │ realtime push              │ REST/RPC
                │                            ▼
┌───────────────┴────────────────────────────────────────────┐
│  Supabase (Postgres + Auth + Realtime)                      │
│  • pools, members, team_assignments, matches, events, scores│
└───────────────▲─────────────────────────────────────────────┘
                │ writes match state + events
┌───────────────┴────────────────────────────────────────────┐
│  Ingestion worker (Node) — polls TxLINE live feeds          │
│  • normalizes scores/events → upserts to Supabase           │
│  • recomputes pool scores → Realtime broadcast              │
└───────────────▲────────────────────────────────────────────┘
                │ live World Cup data
            ┌───┴────┐
            │ TxLINE │  (live scores, odds, match events — 104 games)
            └────────┘
```

## 🧮 Scoring model (v1 — tunable)
Each member owns N assigned teams. Points accrue live:
- **Goal scored** by your team: **+2** (live, the exciting moment)
- **Match win**: **+3** · **Draw**: **+1**
- **Clean sheet**: **+2**
- **Knockout progression** bonus: Round of 16 +5, QF +8, SF +13, Final +21, Champion +34
- Optional odds twist: underdog wins (high pre-match odds) → bonus multiplier (uses TxLINE odds = unique data angle)

## 🗄️ Data model (Supabase)
- `profiles` — wallet_address (PK), display_name, avatar
- `pools` — id, name, owner_wallet, entry_fee, status, created_at
- `pool_members` — pool_id, wallet_address, joined_at, total_points
- `team_assignments` — pool_id, wallet_address, team_id
- `matches` — txline_match_id, home_team, away_team, status, home_score, away_score, kickoff, stage
- `match_events` — match_id, type (goal/red_card/...), team_id, minute, payload
- `score_log` — pool_id, wallet_address, match_id, points, reason, created_at (audit trail / live feed)

## 🔌 TxLINE endpoints (confirmed)
**Auth (2-token):** `POST /auth/guest/start` → guest JWT · on-chain `subscribe(serviceLevel, weeks)` (free tier **12** = real-time) · `POST /api/token/activate` → long-lived API token. Every data call sends `Authorization: Bearer {jwt}` + `X-Api-Token: {apiToken}`.
- `GET /api/fixtures/snapshot?startEpochDay&competitionId` — the World Cup matches
- `GET /api/scores/stream?fixtureId` — **real-time SSE** score updates (drives the live leaderboard)
- `GET /api/scores/snapshot/{fixtureId}?asOf` — current / historical score snapshot
- `GET /api/odds/stream` — real-time SSE odds (underdog-bonus mechanic)
> Soccer score schema: per-participant periods `H1/HT/H2/ET1/ET2/PE/ETTotal/Total`, each `{Goals,YellowCards,RedCards,Corners}`. `gameState` 1-19 (2/4 = live, 5 = finished).
> Quickstart: https://txline.txodds.com/documentation/quickstart · World Cup: https://txline.txodds.com/documentation/worldcup

## 💰 Monetization path
1. **On-chain prize pools** — members pay an entry fee (devnet USDC/SOL); winner takes pot; platform rake %.
2. **Premium pools** — more teams per player, advanced stats, custom scoring.
3. **Sponsored pools** — brands host branded pools with rewards.
4. **Cosmetics** — avatars, pool themes, celebration animations.

---

## 🧱 Tech stack
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
- **Auth/identity:** Solana Wallet Adapter (Phantom) + Supabase
- **Backend:** Supabase (Postgres, Auth, Realtime)
- **Data:** TxLINE live API (ingestion worker)
- **Deploy:** Vercel (frontend) — `*.vercel.app` link (no custom domain required)

## 🗓️ Roadmap (23 days)
- **Week 1 (Jun 26 – Jul 2):** TxLINE API exploration, Supabase schema, wallet sign-in, base mobile UI.
- **Week 2 (Jul 3 – Jul 9):** Pool create/join, team assignment, ingestion worker, live leaderboard.
- **Week 3 (Jul 10 – Jul 16):** Deploy to Vercel, on-chain entry fee (devnet), polish UX, record demo video.
- **Week 4 (Jul 17 – Jul 19):** Test against live data, performance, write docs + feedback, **submit**.

## 🚀 Dev
```bash
npm install
npm run dev
```
Env vars (`.env.local`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SOLANA_NETWORK`, `TXLINE_API_KEY` (worker only).
