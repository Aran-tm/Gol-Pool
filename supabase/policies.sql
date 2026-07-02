-- GolPool RLS policies.
-- Identity is the Solana wallet (not Supabase Auth), so the app uses the anon key — and the
-- anon key is public (visible in the deployed bundle). RLS can only check row contents, not
-- who is really calling, so it can't by itself verify "this wallet is the caller." That check
-- needs a signature, which happens in the wallet-write Edge Function (supabase/functions/wallet-write).
-- Everything below is therefore public READ ONLY: profiles / pools / pool_members /
-- team_assignments have no anon insert/update/delete policy, so PostgREST rejects direct writes
-- with the anon key (RLS defaults to deny when no policy matches). All writes to these tables —
-- and the avatars bucket — go through wallet-write, which verifies the signature server-side
-- and then writes with the service-role key (bypasses RLS by design).
-- matches / match_events / score_log are written only by the ingestion worker (service-role key).

alter table profiles          enable row level security;
alter table pools             enable row level security;
alter table pool_members      enable row level security;
alter table team_assignments  enable row level security;
alter table matches           enable row level security;
alter table match_events      enable row level security;
alter table score_log         enable row level security;

-- Public read on everything (drop-if-exists keeps this re-runnable).
drop policy if exists "read_all" on profiles;
drop policy if exists "read_all" on pools;
drop policy if exists "read_all" on pool_members;
drop policy if exists "read_all" on team_assignments;
drop policy if exists "read_all" on matches;
drop policy if exists "read_all" on match_events;
drop policy if exists "read_all" on score_log;

create policy "read_all" on profiles         for select using (true);
create policy "read_all" on pools            for select using (true);
create policy "read_all" on pool_members     for select using (true);
create policy "read_all" on team_assignments for select using (true);
create policy "read_all" on matches          for select using (true);
create policy "read_all" on match_events     for select using (true);
create policy "read_all" on score_log        for select using (true);

-- Formerly-public write policies on profiles/pools/pool_members/team_assignments — removed.
-- Writes now happen only via wallet-write (service-role, signature-verified). Drops are kept
-- here (re-runnable) so this file stays the source of truth for what access anon actually has.
drop policy if exists "write_all" on profiles;
drop policy if exists "write_all" on pools;
drop policy if exists "write_all" on pool_members;
drop policy if exists "write_all" on team_assignments;

-- Storage bucket for custom profile-picture uploads (NFT avatars use their own URL, no bucket needed).
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

-- Formerly-public write policy on the avatars bucket — removed. Uploads now go through a
-- signed upload URL minted by wallet-write after verifying the wallet's signature, which
-- doesn't require a client-facing storage policy at all. Read stays public (avatars are images
-- meant to be shown in the app).
drop policy if exists "avatars_read_all"  on storage.objects;
drop policy if exists "avatars_write_all" on storage.objects;

create policy "avatars_read_all" on storage.objects for select using (bucket_id = 'avatars');
