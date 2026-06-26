-- GolPool — Supabase schema
-- Run in Supabase SQL editor (or via `supabase db push` with the CLI).
-- Identity = Solana wallet address (text). Auth is wallet-based (sign-in with Solana).

-- ─────────────────────────────────────────────────────────────
-- PROFILES — one row per wallet
-- ─────────────────────────────────────────────────────────────
create table if not exists profiles (
  wallet_address text primary key,
  display_name   text,
  avatar_url     text,
  created_at     timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- POOLS — a sweepstake group
-- ─────────────────────────────────────────────────────────────
create table if not exists pools (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  owner_wallet  text not null references profiles(wallet_address),
  join_code     text unique not null,              -- short code friends use to join
  entry_fee     numeric not null default 0,         -- in SOL/USDC (devnet); 0 = free pool
  status        text not null default 'open',       -- open | locked | finished
  created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- POOL MEMBERS — who is in a pool + their live total
-- ─────────────────────────────────────────────────────────────
create table if not exists pool_members (
  pool_id        uuid not null references pools(id) on delete cascade,
  wallet_address text not null references profiles(wallet_address),
  joined_at      timestamptz not null default now(),
  total_points   integer not null default 0,
  primary key (pool_id, wallet_address)
);

-- ─────────────────────────────────────────────────────────────
-- TEAM ASSIGNMENTS — which World Cup teams a member owns in a pool
-- team_id maps to TxLINE ParticipantId
-- ─────────────────────────────────────────────────────────────
create table if not exists team_assignments (
  pool_id        uuid not null references pools(id) on delete cascade,
  wallet_address text not null,
  team_id        integer not null,                  -- TxLINE ParticipantId
  team_name      text not null,
  primary key (pool_id, team_id),
  foreign key (pool_id, wallet_address) references pool_members(pool_id, wallet_address) on delete cascade
);

-- ─────────────────────────────────────────────────────────────
-- MATCHES — mirror of TxLINE fixtures + live state
-- ─────────────────────────────────────────────────────────────
create table if not exists matches (
  fixture_id      bigint primary key,                -- TxLINE FixtureId
  competition_id  integer,
  competition     text,
  home_team_id    integer not null,
  home_team       text not null,
  away_team_id    integer not null,
  away_team       text not null,
  kickoff         timestamptz,
  game_state      integer not null default 1,        -- TxLINE gameState 1-19
  home_goals      integer not null default 0,
  away_goals      integer not null default 0,
  updated_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- MATCH EVENTS — append-only feed of significant events (drives the live ticker)
-- ─────────────────────────────────────────────────────────────
create table if not exists match_events (
  id          bigint generated always as identity primary key,
  fixture_id  bigint not null references matches(fixture_id) on delete cascade,
  team_id     integer,
  type        text not null,                          -- goal | yellow_card | red_card | corner | status
  minute      integer,
  seq         bigint,                                 -- TxLINE seq for dedupe
  payload     jsonb,
  created_at  timestamptz not null default now(),
  unique (fixture_id, seq, type, team_id)
);

-- ─────────────────────────────────────────────────────────────
-- SCORE LOG — audit trail of every point awarded (also the pool live feed)
-- ─────────────────────────────────────────────────────────────
create table if not exists score_log (
  id             bigint generated always as identity primary key,
  pool_id        uuid not null references pools(id) on delete cascade,
  wallet_address text not null,
  fixture_id     bigint,
  team_id        integer,
  points         integer not null,
  reason         text not null,                       -- 'goal' | 'win' | 'clean_sheet' | 'progression' | ...
  created_at     timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_members_pool      on pool_members(pool_id);
create index if not exists idx_assignments_pool  on team_assignments(pool_id);
create index if not exists idx_events_fixture    on match_events(fixture_id);
create index if not exists idx_scorelog_pool     on score_log(pool_id);

-- Realtime: add the tables the leaderboard subscribes to
-- (run once) ── alter publication supabase_realtime add table pool_members, match_events, matches, score_log;

-- RLS: enable later. For the hackathon MVP, reads are public; writes to matches/events/score_log
-- happen only via the ingestion worker using the service-role key (bypasses RLS).
