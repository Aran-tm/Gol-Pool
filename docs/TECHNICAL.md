# GolPool — Technical Documentation

*The live World Cup sweepstake that scores itself.*
Live: [gol-pool.vercel.app](https://gol-pool.vercel.app) · Repo: [github.com/Aran-tm/Gol-Pool](https://github.com/Aran-tm/Gol-Pool)
Hackathon: TxODDS — Consumer & Fan Experiences (World Cup Track)

---

## 1. Core idea & problem

World Cup sweepstakes today live in a WhatsApp group and a manual spreadsheet: someone assigns teams, and someone has to update the table by hand after every match. It's slow, error-prone, and dead between updates.

**GolPool** turns that into a product that plays itself. Friends connect a Solana wallet, get World Cup teams assigned at random, and the leaderboard updates **live** as goals happen — no spreadsheet, no manual edits. Every goal moves the table in real time.

## 2. How it works (architecture)

```
Browser (React + TS + Vite + Tailwind)
  • Phantom (Solana) sign-in
  • Supabase Realtime → live leaderboard
        ▲ realtime push        │ REST
        │                      ▼
Supabase (Postgres + Realtime)
  pools · pool_members · team_assignments ·
  matches · match_events · score_log · profiles
        ▲ writes match state + goal events
        │
Ingestion worker (Node/tsx — worker/ingest.ts)
  polls TxLINE → upserts matches → emits goal events
        ▲ live World Cup data
        │
      TxLINE  (scores · fixtures · odds — 104 games)
```

Ingestion runs 24/7 as a Supabase Edge Function on a 15s schedule, so the leaderboard stays live without anyone's laptop being on.

## 3. Tech stack

- **Frontend:** React + TypeScript + Vite, Tailwind CSS (mobile-first, `max-w-md`).
- **Backend/data:** Supabase (Postgres + Realtime), RLS on all 7 tables; every write goes through a signature-verified `wallet-write` Edge Function.
- **Auth/identity:** Solana wallet sign-in — real `signMessage` signature, verified server-side. No funds move; wallet = identity only.
- **Live data:** TxLINE (see §5).
- **Deploy:** Vercel (frontend) + Supabase Edge Functions (ingestion).

## 4. Scoring (`src/lib/scoring.ts`)

Per assigned team, accruing live:

| Event | Points | When |
|-------|--------|------|
| Goal scored | +2 | live (the exciting moment) |
| Win | +3 | full-time |
| Draw | +1 | full-time |
| Clean sheet | +2 | full-time |

## 5. TxLINE endpoints used

- `POST /auth/guest/start` — guest JWT
- on-chain `subscribe(serviceLevel, weeks)` + `POST /api/token/activate` — API token
- `GET /api/fixtures/snapshot?competitionId=72` — World Cup fixtures
- `GET /api/scores/snapshot/{fixtureId}` — current/historical score
- `GET /api/scores/stream` — real-time SSE

## 6. Business & monetization path

Today every pool is **free** — wallets are used for sign-up/identity only, funds never move. `pools.entry_fee` already exists in the schema (defaults to `0`) as the seam for what's next:

- **On-chain entry-fee pools** — highest score at tournament end takes the pot (winner-takes-all, platform rake).
- **Premium pools** — more teams, custom scoring rules.
- **Sponsored / branded pools** and cosmetics.

The product is deliberately built free-to-play first so the fan experience is proven before money is on the line.

## 7. TxLINE API feedback

**What worked:** the on-chain `subscribe → activate` flow is genuinely nice — no API-key request form, no waiting on a human. `GET /api/fixtures/snapshot` and `GET /api/scores/snapshot/{fixtureId}` were enough to build a real product on a simple polling loop.

**Friction we hit:**
- **No on-demand "live"/"finished" state for testing.** `competitionId=72` returns fixtures as `Not Started` until real kickoff, and `asOf` doesn't replay a fixture that never played out. We built our own synthetic replay (`worker/replay.ts`) to develop and record a demo. An official sandbox/replay mode would save every live-scores team the same detour.
- **CORS blocks `/api/token/activate` from the browser** — we moved activation to a server-side script (`worker/activate.ts`).
- **`/api/token/activate` sometimes returns the token as plain text, not JSON** — we handle both.
- **`StartTime` is in milliseconds, not seconds** — an easy off-by-1000 trap, not obvious from the docs.

## 8. Reproduce locally

See the [README](../README.md#-local-setup) for full setup. In short: `npm install` → configure `.env.local` → run `supabase/schema.sql` + `supabase/policies.sql` → get the TxLINE token via the in-app Setup flow → `npm run txline:ingest -- --watch` → `npm run dev`.
