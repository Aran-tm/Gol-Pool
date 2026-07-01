// Ingestion worker: TxLINE → Supabase.
// Syncs World Cup fixtures into `matches`, polls live scores, writes goal events.
//   npm run txline:ingest          (one cycle)
//   npm run txline:ingest -- --watch   (poll continuously)
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { NETWORKS, type Network } from "../src/lib/txlineConfig.ts";
import { isFinished, type Fixture, type ScoresEvent } from "../src/lib/txline.ts";

const network = (process.env.TXLINE_NETWORK as Network) || "mainnet";
const apiToken = process.env.TXLINE_API_TOKEN;
const supaUrl = process.env.SUPABASE_URL;
const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const base = NETWORKS[network].txlineBase;
const COMP = 72; // World Cup
const POLL_MS = 15000;
const WATCH = process.argv.includes("--watch");

if (!apiToken || !supaUrl || !supaKey) {
  throw new Error("Missing TXLINE_API_TOKEN / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
}
const supabase = createClient(supaUrl, supaKey, { auth: { persistSession: false } });

// txline (Cloudflare) is intermittently flaky from some networks — retry.
async function fetchRetry(url: string, init: RequestInit, tries = 4): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fetch(url, init);
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }
  throw lastErr;
}
const h = (jwt: string) => ({ Authorization: `Bearer ${jwt}`, "X-Api-Token": apiToken! });
const guest = async () =>
  (await (await fetchRetry(`${base}/auth/guest/start`, { method: "POST" })).json()).token as string;

async function syncFixtures(jwt: string) {
  const fixtures: Fixture[] = await (
    await fetchRetry(`${base}/api/fixtures/snapshot?competitionId=${COMP}`, { headers: h(jwt) })
  ).json();
  const rows = fixtures.map((f) => ({
    fixture_id: f.FixtureId,
    competition_id: f.CompetitionId,
    competition: f.Competition,
    home_team_id: f.Participant1Id,
    home_team: f.Participant1,
    away_team_id: f.Participant2Id,
    away_team: f.Participant2,
    kickoff: new Date(f.StartTime).toISOString(),
  }));
  const { error } = await supabase.from("matches").upsert(rows, { onConflict: "fixture_id" });
  if (error) throw new Error(`upsert matches: ${error.message}`);
  console.log(`Synced ${rows.length} fixtures.`);
}

async function pollScores(jwt: string) {
  const { data: matches, error } = await supabase.from("matches").select("*");
  if (error) throw new Error(`select matches: ${error.message}`);

  let live = 0;
  let updated = 0;
  for (const m of matches ?? []) {
    if (isFinished(m.game_state)) continue;
    let snaps: ScoresEvent[];
    try {
      snaps = await (
        await fetchRetry(`${base}/api/scores/snapshot/${m.fixture_id}`, { headers: h(jwt) })
      ).json();
    } catch {
      continue;
    }
    const last = snaps?.[snaps.length - 1];
    if (!last) continue;

    const gs = Number(last.gameState ?? m.game_state);
    const p1 = last.scoreSoccer?.Participant1?.Total;
    const p2 = last.scoreSoccer?.Participant2?.Total;
    const hg = p1?.Goals ?? 0;
    const ag = p2?.Goals ?? 0;
    if (gs === 2 || gs === 4) live++;

    // New goals since last poll → append events (idempotent via unique seq).
    const events: Record<string, unknown>[] = [];
    for (let n = (m.home_goals ?? 0) + 1; n <= hg; n++)
      events.push({ fixture_id: m.fixture_id, team_id: m.home_team_id, type: "goal", seq: n, minute: last.ts ?? null, payload: { team: m.home_team } });
    for (let n = (m.away_goals ?? 0) + 1; n <= ag; n++)
      events.push({ fixture_id: m.fixture_id, team_id: m.away_team_id, type: "goal", seq: n, minute: last.ts ?? null, payload: { team: m.away_team } });
    if (events.length)
      await supabase.from("match_events").upsert(events, {
        onConflict: "fixture_id,seq,type,team_id",
        ignoreDuplicates: true,
      });

    // Match stats from the aggregate Total period (TxLINE gives corners + cards, no shots).
    const hc = p1?.Corners ?? 0, ac = p2?.Corners ?? 0;
    const hy = p1?.YellowCards ?? 0, ay = p2?.YellowCards ?? 0;
    const hr = p1?.RedCards ?? 0, ar = p2?.RedCards ?? 0;

    const statsChanged =
      hc !== m.home_corners || ac !== m.away_corners ||
      hy !== m.home_yellows || ay !== m.away_yellows ||
      hr !== m.home_reds || ar !== m.away_reds;

    if (gs !== m.game_state || hg !== m.home_goals || ag !== m.away_goals || statsChanged) {
      await supabase
        .from("matches")
        .update({
          game_state: gs, home_goals: hg, away_goals: ag,
          home_corners: hc, away_corners: ac,
          home_yellows: hy, away_yellows: ay,
          home_reds: hr, away_reds: ar,
          updated_at: new Date().toISOString(),
        })
        .eq("fixture_id", m.fixture_id);
      updated++;
      console.log(`  ⚽ ${m.home_team} ${hg}-${ag} ${m.away_team} [state ${gs}]`);
    }
  }
  console.log(`Polled ${matches?.length ?? 0} matches · ${live} live · ${updated} updated.`);
}

async function cycle() {
  const jwt = await guest();
  await syncFixtures(jwt);
  await pollScores(jwt);
}

async function main() {
  console.log(`\n=== GolPool ingest (${network}) ===`);
  await cycle();
  if (WATCH) {
    console.log(`\nWatching every ${POLL_MS / 1000}s (Ctrl+C to stop)…`);
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      try {
        await cycle();
      } catch (e) {
        console.error("cycle error:", e instanceof Error ? e.message : e);
      }
    }
  }
}

main().catch((e: unknown) => {
  console.error("FATAL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
