// Supabase Edge Function (Deno): the ONLY path allowed to write to profiles / pools /
// pool_members / team_assignments / avatars. Verifies an ed25519 signature proving the
// caller controls `wallet` before touching any row, then writes with the service-role key.
//
// Why: RLS alone can't verify wallet ownership — the app has no Supabase Auth session
// (identity = Solana wallet), so a client-supplied `wallet_address` in a REST call is
// otherwise unverifiable. This function is the server-side identity check.
//
// Deploy: supabase functions deploy wallet-write
//         (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected automatically)
//
// deno-lint-ignore-file
// @ts-nocheck  — this file runs on Deno (Supabase Edge), not in the app's Node/TS build.
import { createClient } from "jsr:@supabase/supabase-js@2";
import nacl from "npm:tweetnacl@1.0.3";
import bs58 from "npm:bs58@6.0.0";

const SESSION_MAX_MS = 12 * 60 * 60 * 1000; // must match src/lib/walletAuth.ts
const CLOCK_SKEW_MS = 60_000;
const TEAMS_PER_MEMBER = 4;
const MAX_PLAYERS_PER_POOL = 10;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: CORS });

const MESSAGE_RE = /^GolPool wants you to sign in\.\nWallet: (.+)\nIssued: (\d+)\nExpires: (\d+)$/;

function verifySession(wallet: string, message: string, signatureB64: string): boolean {
  const m = MESSAGE_RE.exec(message);
  if (!m || m[1] !== wallet) return false;
  const issued = Number(m[2]);
  const expires = Number(m[3]);
  const now = Date.now();
  if (expires - issued > SESSION_MAX_MS + CLOCK_SKEW_MS) return false; // can't self-grant a longer session
  if (now < issued - CLOCK_SKEW_MS || now > expires) return false; // not-yet-valid or expired
  try {
    const sig = Uint8Array.from(atob(signatureB64), (c) => c.charCodeAt(0));
    const pub = bs58.decode(wallet);
    return nacl.sign.detached.verify(new TextEncoder().encode(message), sig, pub);
  } catch {
    return false;
  }
}

function randomCode(len = 5): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function distinctTeams(matches: Record<string, unknown>[]): { id: number; name: string }[] {
  const map = new Map<number, string>();
  for (const m of matches) {
    map.set(m.home_team_id as number, m.home_team as string);
    map.set(m.away_team_id as number, m.away_team as string);
  }
  return [...map.entries()].map(([id, name]) => ({ id, name }));
}

async function ensureProfileRow(db, wallet: string) {
  const { data } = await db.from("profiles").select("wallet_address").eq("wallet_address", wallet).maybeSingle();
  if (!data) await db.from("profiles").insert({ wallet_address: wallet });
}

async function assignTeams(db, poolId: string, wallet: string, count = TEAMS_PER_MEMBER) {
  const { data: matches } = await db.from("matches").select("*");
  const all = distinctTeams(matches ?? []);
  const { data: taken } = await db.from("team_assignments").select("team_id").eq("pool_id", poolId);
  const takenIds = new Set((taken ?? []).map((t) => t.team_id));
  const available = all.filter((t) => !takenIds.has(t.id));
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  const picked = available.slice(0, count);
  if (picked.length === 0) return;
  await db.from("team_assignments").insert(
    picked.map((t) => ({ pool_id: poolId, wallet_address: wallet, team_id: t.id, team_name: t.name })),
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "missing env" }, 500);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  const { wallet, message, signature, action, payload } = body ?? {};
  if (typeof wallet !== "string" || typeof message !== "string" || typeof signature !== "string" || typeof action !== "string") {
    return json({ error: "missing wallet/message/signature/action" }, 400);
  }
  if (!verifySession(wallet, message, signature)) return json({ error: "invalid or expired signature" }, 401);

  const db = createClient(url, key, { auth: { persistSession: false } });
  const p = (payload ?? {}) as Record<string, unknown>;

  try {
    switch (action) {
      case "ensure_profile": {
        await ensureProfileRow(db, wallet);
        return json({ ok: true });
      }
      case "update_display_name": {
        if (typeof p.display_name !== "string") return json({ error: "display_name required" }, 400);
        await db.from("profiles").upsert({ wallet_address: wallet, display_name: p.display_name }, { onConflict: "wallet_address" });
        return json({ ok: true });
      }
      case "update_avatar": {
        await db.from("profiles").upsert({ wallet_address: wallet, avatar_url: p.avatar_url ?? null }, { onConflict: "wallet_address" });
        return json({ ok: true });
      }
      case "get_avatar_upload_url": {
        const ext = typeof p.ext === "string" && /^[a-z0-9]{1,8}$/i.test(p.ext) ? p.ext : "jpg";
        const path = `${wallet}/avatar.${ext}`;
        const { data, error } = await db.storage.from("avatars").createSignedUploadUrl(path, { upsert: true });
        if (error) return json({ error: error.message }, 500);
        return json({ path, token: data.token });
      }
      case "create_pool": {
        if (typeof p.name !== "string" || !p.name.trim()) return json({ error: "name required" }, 400);
        await ensureProfileRow(db, wallet);
        const { data: pool, error } = await db
          .from("pools")
          .insert({ name: p.name.trim(), owner_wallet: wallet, join_code: randomCode() })
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        await db.from("pool_members").insert({ pool_id: pool.id, wallet_address: wallet });
        await assignTeams(db, pool.id, wallet);
        return json({ pool });
      }
      case "join_pool": {
        if (typeof p.join_code !== "string") return json({ error: "join_code required" }, 400);
        await ensureProfileRow(db, wallet);
        const { data: pool, error } = await db
          .from("pools")
          .select("*")
          .eq("join_code", p.join_code.toUpperCase().trim())
          .single();
        if (error || !pool) return json({ error: "Pool not found for that code." }, 404);
        if (pool.status && pool.status !== "open") return json({ error: "This pool is closed to new players." }, 409);

        const { data: existing } = await db
          .from("pool_members")
          .select("wallet_address")
          .eq("pool_id", pool.id)
          .eq("wallet_address", wallet)
          .maybeSingle();
        if (!existing) {
          const { count } = await db.from("pool_members").select("*", { count: "exact", head: true }).eq("pool_id", pool.id);
          if ((count ?? 0) >= MAX_PLAYERS_PER_POOL) {
            return json({ error: `This pool is full (max ${MAX_PLAYERS_PER_POOL} players).` }, 409);
          }
          await db.from("pool_members").insert({ pool_id: pool.id, wallet_address: wallet });
          await assignTeams(db, pool.id, wallet);
        }
        return json({ pool });
      }
      case "set_pool_status": {
        if (typeof p.pool_id !== "string" || typeof p.status !== "string") return json({ error: "pool_id/status required" }, 400);
        const { data: pool } = await db.from("pools").select("owner_wallet").eq("id", p.pool_id).maybeSingle();
        if (!pool) return json({ error: "pool not found" }, 404);
        if (pool.owner_wallet !== wallet) return json({ error: "not the pool owner" }, 403);
        const { error } = await db.from("pools").update({ status: p.status }).eq("id", p.pool_id);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }
      case "delete_pool": {
        if (typeof p.pool_id !== "string") return json({ error: "pool_id required" }, 400);
        const { data: pool } = await db.from("pools").select("owner_wallet").eq("id", p.pool_id).maybeSingle();
        if (!pool) return json({ error: "pool not found" }, 404);
        if (pool.owner_wallet !== wallet) return json({ error: "not the pool owner" }, 403);
        const { error } = await db.from("pools").delete().eq("id", p.pool_id);
        if (error) return json({ error: error.message }, 500);
        return json({ ok: true });
      }
      default:
        return json({ error: "unknown action" }, 400);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
