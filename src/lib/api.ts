// GolPool data layer over Supabase. Identity = Solana wallet address.
import { supabase } from "./supabase";
import { type MatchRow } from "./scoring";
import { walletWrite, type SignMessage } from "./walletAuth";

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

// Creating/joining a pool writes to profiles/pools/pool_members/team_assignments, so it
// runs server-side in the wallet-write Edge Function (verified by wallet signature) rather
// than directly from the browser — see supabase/functions/wallet-write.
export async function createPool(name: string, wallet: string, signMessage: SignMessage): Promise<Pool> {
  const { pool } = await walletWrite<{ pool: Pool }>(wallet, signMessage, "create_pool", { name });
  return pool;
}

export async function joinPool(joinCode: string, wallet: string, signMessage: SignMessage): Promise<Pool> {
  const { pool } = await walletWrite<{ pool: Pool }>(wallet, signMessage, "join_pool", { join_code: joinCode });
  return pool;
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

/** Owner-only: set pool status ('open' | 'locked'). Ownership is checked server-side. */
export async function setPoolStatus(poolId: string, wallet: string, signMessage: SignMessage, status: string): Promise<void> {
  await walletWrite(wallet, signMessage, "set_pool_status", { pool_id: poolId, status });
}

/** Owner-only: delete a pool (cascades to members, assignments). Ownership is checked server-side. */
export async function deletePool(poolId: string, wallet: string, signMessage: SignMessage): Promise<void> {
  await walletWrite(wallet, signMessage, "delete_pool", { pool_id: poolId });
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

/** Update (or clear) a user's display name. Only the signing wallet's own row can change. */
export async function updateDisplayName(wallet: string, signMessage: SignMessage, name: string): Promise<void> {
  await walletWrite(wallet, signMessage, "update_display_name", { display_name: name });
}

/** Set (or clear) a user's avatar image URL (e.g. a chosen NFT). Only the signing wallet's own row can change. */
export async function updateAvatar(wallet: string, signMessage: SignMessage, url: string | null): Promise<void> {
  await walletWrite(wallet, signMessage, "update_avatar", { avatar_url: url });
}

/** Upload a custom profile picture to the `avatars` bucket and return its public URL.
 * A signed upload URL is minted server-side (after verifying the wallet's signature) so the
 * browser never gets blanket write access to the bucket — it can only write to its own path. */
export async function uploadAvatarImage(wallet: string, signMessage: SignMessage, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const { path, token } = await walletWrite<{ path: string; token: string }>(wallet, signMessage, "get_avatar_upload_url", { ext });
  const { error } = await supabase.storage.from("avatars").uploadToSignedUrl(path, token, file);
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
