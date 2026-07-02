// GolPool data layer over Supabase. Identity = Solana wallet address.
import { supabase } from "./supabase";
import { distinctTeams, type MatchRow } from "./scoring";

export interface Pool {
  id: string;
  name: string;
  owner_wallet: string;
  join_code: string;
  entry_fee: number;
  status: string;
  created_at: string;
}
export interface Member {
  pool_id: string;
  wallet_address: string;
  total_points: number;
  joined_at: string;
}
export interface Assignment {
  pool_id: string;
  wallet_address: string;
  team_id: number;
  team_name: string;
}

const TEAMS_PER_MEMBER = 4;
// Keeps every member's team allotment full: today's World Cup team supply is 39-48,
// and beyond 10 members some would silently get a partial or empty team set.
const MAX_PLAYERS_PER_POOL = 10;

function randomCode(len = 5): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function ensureProfile(wallet: string, displayName?: string) {
  await supabase
    .from("profiles")
    .upsert({ wallet_address: wallet, display_name: displayName ?? null }, { onConflict: "wallet_address" });
}

export async function getMatches(): Promise<MatchRow[]> {
  const { data, error } = await supabase
    .from("matches")
    // select * so the app works before AND after the stats-columns migration
    // (missing columns simply come back undefined → treated as 0 in the UI).
    .select("*")
    .order("kickoff", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MatchRow[];
}

/** Assign `count` random not-yet-taken teams to a member in a pool. */
async function assignTeams(poolId: string, wallet: string, count = TEAMS_PER_MEMBER) {
  const matches = await getMatches();
  const all = distinctTeams(matches);

  const { data: taken, error: takenError } = await supabase
    .from("team_assignments")
    .select("team_id")
    .eq("pool_id", poolId);
  if (takenError) throw takenError; // otherwise a failed read here silently double-assigns taken teams
  const takenIds = new Set((taken ?? []).map((t) => t.team_id));

  const available = all.filter((t) => !takenIds.has(t.id));
  // shuffle
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  const picked = available.slice(0, count);
  if (picked.length === 0) return;

  await supabase.from("team_assignments").insert(
    picked.map((t) => ({ pool_id: poolId, wallet_address: wallet, team_id: t.id, team_name: t.name })),
  );
}

export async function createPool(name: string, wallet: string): Promise<Pool> {
  await ensureProfile(wallet);
  const join_code = randomCode();
  const { data, error } = await supabase
    .from("pools")
    .insert({ name, owner_wallet: wallet, join_code })
    .select()
    .single();
  if (error) throw error;

  await supabase.from("pool_members").insert({ pool_id: data.id, wallet_address: wallet });
  await assignTeams(data.id, wallet);
  return data as Pool;
}

export async function joinPool(joinCode: string, wallet: string): Promise<Pool> {
  await ensureProfile(wallet);
  const { data: pool, error } = await supabase
    .from("pools")
    .select("*")
    .eq("join_code", joinCode.toUpperCase().trim())
    .single();
  if (error || !pool) throw new Error("Pool not found for that code.");
  if (pool.status && pool.status !== "open") throw new Error("This pool is closed to new players.");

  const { data: existing } = await supabase
    .from("pool_members")
    .select("wallet_address")
    .eq("pool_id", pool.id)
    .eq("wallet_address", wallet)
    .maybeSingle();

  if (!existing) {
    const memberCount = await getPoolMemberCount(pool.id);
    if (memberCount >= MAX_PLAYERS_PER_POOL) {
      throw new Error(`This pool is full (max ${MAX_PLAYERS_PER_POOL} players).`);
    }
    await supabase.from("pool_members").insert({ pool_id: pool.id, wallet_address: wallet });
    await assignTeams(pool.id, wallet);
  }
  return pool as Pool;
}

export async function getMyPools(wallet: string): Promise<Pool[]> {
  const { data: memberships, error: membershipsError } = await supabase
    .from("pool_members")
    .select("pool_id")
    .eq("wallet_address", wallet);
  if (membershipsError) throw membershipsError;
  const ids = (memberships ?? []).map((m) => m.pool_id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("pools").select("*").in("id", ids).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Pool[];
}

export async function getPool(poolId: string): Promise<Pool | null> {
  const { data, error } = await supabase.from("pools").select("*").eq("id", poolId).single();
  if (error && error.code !== "PGRST116") throw error; // PGRST116 = no row found → null is correct
  return (data as Pool) ?? null;
}

/** Owner-only: set pool status ('open' | 'locked'). */
export async function setPoolStatus(poolId: string, wallet: string, status: string): Promise<void> {
  const { error } = await supabase
    .from("pools")
    .update({ status })
    .eq("id", poolId)
    .eq("owner_wallet", wallet); // RLS-lite: only the owner row matches
  if (error) throw error;
}

/** Owner-only: delete a pool (cascades to members, assignments, score_log). */
export async function deletePool(poolId: string, wallet: string): Promise<void> {
  const { error } = await supabase
    .from("pools")
    .delete()
    .eq("id", poolId)
    .eq("owner_wallet", wallet);
  if (error) throw error;
}

export async function getMembers(poolId: string): Promise<Member[]> {
  const { data, error } = await supabase.from("pool_members").select("*").eq("pool_id", poolId);
  if (error) throw error;
  return (data ?? []) as Member[];
}

export async function getAssignments(poolId: string): Promise<Assignment[]> {
  const { data, error } = await supabase.from("team_assignments").select("*").eq("pool_id", poolId);
  if (error) throw error;
  return (data ?? []) as Assignment[];
}

/** Get member count for a pool (lightweight — no full member list). */
export async function getPoolMemberCount(poolId: string): Promise<number> {
  const { count, error } = await supabase
    .from("pool_members")
    .select("*", { count: "exact", head: true })
    .eq("pool_id", poolId);
  if (error) throw error;
  return count ?? 0;
}

export interface ProfileInfo {
  display_name: string | null;
  avatar_url: string | null;
}

/** Fetch display names + avatars for a set of wallets → Map<wallet, ProfileInfo>. */
export async function getProfiles(wallets: string[]): Promise<Map<string, ProfileInfo>> {
  if (wallets.length === 0) return new Map();
  const { data, error } = await supabase
    .from("profiles")
    .select("wallet_address,display_name,avatar_url")
    .in("wallet_address", wallets);
  if (error) throw error;
  const map = new Map<string, ProfileInfo>();
  for (const p of data ?? []) {
    map.set(p.wallet_address, { display_name: p.display_name ?? null, avatar_url: p.avatar_url ?? null });
  }
  return map;
}

/** Update (or clear) a user's display name. */
export async function updateDisplayName(wallet: string, name: string): Promise<void> {
  await supabase
    .from("profiles")
    .upsert({ wallet_address: wallet, display_name: name }, { onConflict: "wallet_address" });
}

/** Set (or clear) a user's avatar image URL (e.g. a chosen NFT). */
export async function updateAvatar(wallet: string, url: string | null): Promise<void> {
  await supabase
    .from("profiles")
    .upsert({ wallet_address: wallet, avatar_url: url }, { onConflict: "wallet_address" });
}

/** Upload a custom profile picture to the `avatars` bucket and return its public URL. */
export async function uploadAvatarImage(wallet: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${wallet}/avatar.${ext}`; // fixed path per wallet: re-upload overwrites (edit = upload again)
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

export interface GoalEvent {
  id: number;
  fixture_id: number;
  team_id: number;
  team_name: string;
  created_at: string;
}

/** Goal events for a set of fixtures, most recent first (drives the pool activity feed). */
export async function getGoalEvents(fixtureIds: number[]): Promise<GoalEvent[]> {
  if (fixtureIds.length === 0) return [];
  const { data } = await supabase
    .from("match_events")
    .select("id,fixture_id,team_id,type,payload,created_at")
    .in("fixture_id", fixtureIds)
    .eq("type", "goal")
    .order("id", { ascending: false })
    .limit(50);
  return (data ?? []).map((e) => ({
    id: e.id,
    fixture_id: e.fixture_id,
    team_id: e.team_id,
    team_name: (e.payload as { team?: string } | null)?.team ?? "",
    created_at: e.created_at,
  }));
}

/** Subscribe to match_events inserts; calls cb on any change. Returns an unsubscribe fn. */
export function subscribeEvents(cb: () => void): () => void {
  const channel = supabase
    .channel("events-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "match_events" }, cb)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

/** Subscribe to live match updates; calls cb on any change. Returns an unsubscribe fn. */
export function subscribeMatches(cb: () => void): () => void {
  const channel = supabase
    .channel("matches-live")
    .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, cb)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
