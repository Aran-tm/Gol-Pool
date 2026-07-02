-- One-off migration: remove the unused score_log table.
-- Points are derived live in the client (src/lib/scoring.ts) from matches +
-- team_assignments + match_events, so this table was never read or written.
-- Removing it from schema.sql doesn't touch the live DB, so run this once in the
-- Supabase SQL Editor. `cascade` also clears its index, RLS policy, and realtime
-- publication membership.
drop table if exists score_log cascade;
