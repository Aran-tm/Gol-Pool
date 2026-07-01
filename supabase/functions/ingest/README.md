# GolPool auto-ingest (Supabase Edge Function + cron)

Keeps the `matches` table live 24/7 by polling TxLINE on a schedule — no local machine
needed. The browser is already subscribed to Supabase Realtime, so the app updates itself.

## Prerequisites
- Supabase CLI installed and logged in: `supabase login`
- Repo linked to your project: `supabase link --project-ref <PROJECT_REF>`
  (find `<PROJECT_REF>` in your Supabase dashboard URL: `https://supabase.com/dashboard/project/<PROJECT_REF>`)

## 1. Set the secret (only the TxLINE token is needed)
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically into Edge Functions.

```bash
supabase secrets set TXLINE_API_TOKEN=<your token from .env.local> TXLINE_NETWORK=mainnet
```

## 2. Deploy the function
```bash
supabase functions deploy ingest --no-verify-jwt
```
`--no-verify-jwt` lets the cron job invoke it without an auth header. It only triggers a
poll (no data in/out), so leaving it open is low-risk for the hackathon.

Test it once manually:
```bash
supabase functions invoke ingest
# → { ok: true, polled: N, live: L, updated: U, skipped: S, failed: F }
```

## 3. Schedule it every minute (pg_cron + pg_net)
In the Supabase dashboard → **SQL Editor**, enable the extensions once (Database → Extensions:
enable `pg_cron` and `pg_net`), then run — replacing `<PROJECT_REF>`:

```sql
select cron.schedule(
  'golpool-ingest',
  '* * * * *',                         -- every minute
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/ingest',
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  $$
);
```

Verify / manage:
```sql
select * from cron.job;                         -- list schedules
select cron.unschedule('golpool-ingest');       -- remove it
```

> Alternative (no SQL): Supabase dashboard → **Edge Functions → ingest → Schedules** (or the
> **Integrations → Cron** UI) and add a `* * * * *` schedule pointing at the function.

## Notes
- The function skips finished matches and fixtures kicking off >3h away, so each run is fast
  and stays well under the Edge Function time limit.
- During the hackathon window, real matches flip to Live/Finished automatically at their real
  kickoff times. When no match is live (e.g. during judging), use `npm run txline:replay` to
  drive a synthetic live match for the demo video.
