// Supabase Edge Function (Deno): TxLINE → Supabase ingestion, run on a cron schedule
// so match data stays live 24/7 without a local machine. Mirrors worker/ingest.ts.
//
// Deploy:   supabase functions deploy ingest --no-verify-jwt
// Secret:   supabase secrets set TXLINE_API_TOKEN=... TXLINE_NETWORK=mainnet
//           (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected automatically)
// Schedule: see supabase/functions/ingest/README.md (pg_cron every minute).
//
// deno-lint-ignore-file
// @ts-nocheck  — this file runs on Deno (Supabase Edge), not in the app's Node/TS build.
import { createClient } from "jsr:@supabase/supabase-js@2";

const NETWORKS: Record<string, string> = {
  mainnet: "https://txline.txodds.com",
  devnet: "https://txline-dev.txodds.com",
};
const COMP = 72; // World Cup
const HORIZON_MS = 3 * 60 * 60 * 1000;
const isFinished = (s: number) => s === 5 || s === 10 || s === 13;

// Snapshot events arrive UNORDERED and sparse: the final-whistle event (StatusId 5)
// carries no Score, and the newest score-bearing event may not carry the newest
// status. Fold by Seq, keeping the newest StatusId and the newest non-empty Score.
// Reads both feed schemas: live PascalCase (StatusId/Score/Seq/Ts) and the replay's
// camelCase (gameState/scoreSoccer/seq/ts).
function foldSnapshot(snaps, fallbackState) {
  let gs = fallbackState, score = null, ts = null;
  const sorted = [...(snaps ?? [])].sort((a, b) => (a.Seq ?? a.seq ?? 0) - (b.Seq ?? b.seq ?? 0));
  for (const e of sorted) {
    const st = e.StatusId ?? Number(e.gameState);
    if (st != null && !Number.isNaN(st)) gs = st;
    const sc = e.Score ?? e.scoreSoccer;
    if (sc && (Object.keys(sc.Participant1 ?? {}).length || Object.keys(sc.Participant2 ?? {}).length)) {
      score = sc;
      ts = e.Ts ?? e.ts ?? ts;
    }
  }
  return { gs, score, ts };
}

Deno.serve(async () => {
  const token = Deno.env.get("TXLINE_API_TOKEN");
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const network = Deno.env.get("TXLINE_NETWORK") ?? "mainnet";
  const base = NETWORKS[network] ?? NETWORKS.mainnet;
  if (!token || !url || !key) {
    return Response.json({ ok: false, error: "missing env (TXLINE_API_TOKEN / SUPABASE_*)" }, { status: 500 });
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Guest JWT (live session).
  const jwt = (await (await fetch(`${base}/auth/guest/start`, { method: "POST" })).json()).token as string;
  const h = { Authorization: `Bearer ${jwt}`, "X-Api-Token": token };

  // Sync fixtures (cheap upsert; only fixture fields, never touches state/goals).
  try {
    const fixtures = await (await fetch(`${base}/api/fixtures/snapshot?competitionId=${COMP}`, { headers: h })).json();
    const rows = (fixtures ?? []).map((f: Record<string, unknown>) => ({
      fixture_id: f.FixtureId,
      competition_id: f.CompetitionId,
      competition: f.Competition,
      home_team_id: f.Participant1Id,
      home_team: f.Participant1,
      away_team_id: f.Participant2Id,
      away_team: f.Participant2,
      kickoff: new Date(f.StartTime as number).toISOString(),
    }));
    if (rows.length) await supabase.from("matches").upsert(rows, { onConflict: "fixture_id" });
  } catch { /* fixtures sync best-effort */ }

  // Poll scores for live / soon / in-progress fixtures.
  const { data: matches, error } = await supabase.from("matches").select("*");
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  const now = Date.now();
  let live = 0, updated = 0, failed = 0, skipped = 0;
  for (const m of matches ?? []) {
    if (isFinished(m.game_state)) continue;
    if (m.game_state === 1 && m.kickoff && new Date(m.kickoff).getTime() - now > HORIZON_MS) { skipped++; continue; }

    let snaps: Array<Record<string, unknown>>;
    try {
      const res = await fetch(`${base}/api/scores/snapshot/${m.fixture_id}`, { headers: h });
      if (!res.ok) { failed++; continue; }
      snaps = await res.json();
    } catch { failed++; continue; }
    if (!snaps?.length) continue;

    const { gs, score, ts } = foldSnapshot(snaps, m.game_state);
    const p1 = score?.Participant1?.Total;
    const p2 = score?.Participant2?.Total;
    // No score-bearing event yet → keep existing numbers, never regress to 0.
    const hg = score ? p1?.Goals ?? 0 : m.home_goals ?? 0;
    const ag = score ? p2?.Goals ?? 0 : m.away_goals ?? 0;
    if (gs === 2 || gs === 4) live++;

    const events: Record<string, unknown>[] = [];
    for (let n = (m.home_goals ?? 0) + 1; n <= hg; n++)
      events.push({ fixture_id: m.fixture_id, team_id: m.home_team_id, type: "goal", seq: n, minute: ts, payload: { team: m.home_team } });
    for (let n = (m.away_goals ?? 0) + 1; n <= ag; n++)
      events.push({ fixture_id: m.fixture_id, team_id: m.away_team_id, type: "goal", seq: n, minute: ts, payload: { team: m.away_team } });
    if (events.length)
      await supabase.from("match_events").upsert(events, { onConflict: "fixture_id,seq,type,team_id", ignoreDuplicates: true });

    const hc = score ? p1?.Corners ?? 0 : m.home_corners ?? 0;
    const ac = score ? p2?.Corners ?? 0 : m.away_corners ?? 0;
    const hy = score ? p1?.YellowCards ?? 0 : m.home_yellows ?? 0;
    const ay = score ? p2?.YellowCards ?? 0 : m.away_yellows ?? 0;
    const hr = score ? p1?.RedCards ?? 0 : m.home_reds ?? 0;
    const ar = score ? p2?.RedCards ?? 0 : m.away_reds ?? 0;
    const statsChanged =
      hc !== m.home_corners || ac !== m.away_corners ||
      hy !== m.home_yellows || ay !== m.away_yellows ||
      hr !== m.home_reds || ar !== m.away_reds;

    if (gs !== m.game_state || hg !== m.home_goals || ag !== m.away_goals || statsChanged) {
      await supabase.from("matches").update({
        game_state: gs, home_goals: hg, away_goals: ag,
        home_corners: hc, away_corners: ac, home_yellows: hy, away_yellows: ay, home_reds: hr, away_reds: ar,
        updated_at: new Date().toISOString(),
      }).eq("fixture_id", m.fixture_id);
      updated++;
    }
  }

  return Response.json({ ok: true, polled: matches?.length ?? 0, live, updated, skipped, failed });
});
