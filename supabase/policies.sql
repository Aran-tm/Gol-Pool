-- GolPool RLS policies (MVP).
-- Identity is the Solana wallet (not Supabase Auth), so the app uses the anon key.
-- These policies allow public read everywhere + public write on user-facing tables.
-- matches / match_events are written only by the service-role worker (bypasses RLS).
-- NOTE: tighten before production (per-wallet checks / signed requests).

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

-- Public write on user-facing tables (create/join pools from the browser).
drop policy if exists "write_all" on profiles;
drop policy if exists "write_all" on pools;
drop policy if exists "write_all" on pool_members;
drop policy if exists "write_all" on team_assignments;

create policy "write_all" on profiles         for all using (true) with check (true);
create policy "write_all" on pools            for all using (true) with check (true);
create policy "write_all" on pool_members     for all using (true) with check (true);
create policy "write_all" on team_assignments for all using (true) with check (true);

-- Storage bucket for custom profile-picture uploads (NFT avatars use their own URL, no bucket needed).
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

drop policy if exists "avatars_read_all"  on storage.objects;
drop policy if exists "avatars_write_all" on storage.objects;

create policy "avatars_read_all"  on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_write_all" on storage.objects for all
  using (bucket_id = 'avatars') with check (bucket_id = 'avatars');
