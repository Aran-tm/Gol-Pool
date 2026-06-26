import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  getPool,
  getMembers,
  getAssignments,
  getMatches,
  subscribeMatches,
  type Pool,
  type Member,
  type Assignment,
} from "../lib/api";
import { memberPoints, type MatchRow } from "../lib/scoring";
import { isLive, GAME_STATE } from "../lib/txline";

const short = (w: string) => `${w.slice(0, 4)}…${w.slice(-4)}`;

interface Row {
  wallet: string;
  points: number;
  teams: { id: number; name: string }[];
}

export default function PoolDetail({ poolId, onBack }: { poolId: string; onBack: () => void }) {
  const { publicKey } = useWallet();
  const me = publicKey?.toBase58() ?? "";

  const [pool, setPool] = useState<Pool | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState(false);

  const loadStatic = useCallback(async () => {
    const [p, m, a] = await Promise.all([getPool(poolId), getMembers(poolId), getAssignments(poolId)]);
    setPool(p);
    setMembers(m);
    setAssignments(a);
  }, [poolId]);

  const loadMatches = useCallback(async () => {
    setMatches(await getMatches());
  }, []);

  useEffect(() => {
    loadStatic();
    loadMatches();
    const unsub = subscribeMatches(() => {
      loadMatches();
      setFlash(true);
      setTimeout(() => setFlash(false), 800);
    });
    return unsub;
  }, [loadStatic, loadMatches]);

  const rows: Row[] = useMemo(() => {
    return members
      .map((mem) => {
        const teams = assignments
          .filter((a) => a.wallet_address === mem.wallet_address)
          .map((a) => ({ id: a.team_id, name: a.team_name }));
        return {
          wallet: mem.wallet_address,
          points: memberPoints(teams.map((t) => t.id), matches),
          teams,
        };
      })
      .sort((a, b) => b.points - a.points);
  }, [members, assignments, matches]);

  const liveMatches = matches.filter((m) => isLive(m.game_state));
  const medal = ["🥇", "🥈", "🥉"];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-8">
      <button onClick={onBack} className="mb-4 self-start text-sm text-white/60 hover:text-white">
        ← Pools
      </button>

      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-black">{pool?.name ?? "…"}</h1>
        <button
          onClick={() => {
            if (pool) {
              navigator.clipboard.writeText(pool.join_code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }
          }}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-xs"
        >
          {copied ? "Copied ✓" : `Code: ${pool?.join_code ?? "…"}`}
        </button>
      </div>

      {/* Live matches strip */}
      {liveMatches.length > 0 && (
        <div className="mt-4 space-y-1 rounded-xl border border-red-500/40 bg-red-500/10 p-3">
          <div className="text-xs font-semibold uppercase tracking-widest text-red-300">
            🔴 Live now
          </div>
          {liveMatches.map((m) => (
            <div key={m.fixture_id} className="flex justify-between text-sm">
              <span>
                {m.home_team} <b>{m.home_goals}</b>–<b>{m.away_goals}</b> {m.away_team}
              </span>
              <span className="text-white/50">{GAME_STATE[m.game_state]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-white/40">Leaderboard</span>
          <span className={`text-xs ${flash ? "text-gold" : "text-white/30"} transition`}>
            {flash ? "updating…" : "live"}
          </span>
        </div>

        <div className="space-y-2">
          {rows.map((r, i) => (
            <div
              key={r.wallet}
              className={`rounded-xl border p-3 transition ${
                r.wallet === me ? "border-grass/60 bg-grass/10" : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 text-center text-lg">{medal[i] ?? i + 1}</span>
                  <span className="font-mono text-sm">
                    {short(r.wallet)} {r.wallet === me && <span className="text-grass">(you)</span>}
                  </span>
                </div>
                <span className="text-xl font-black text-gold">{r.points}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1 pl-8">
                {r.teams.map((t) => (
                  <span
                    key={t.id}
                    className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] text-white/70"
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/50">
              No members yet.
            </p>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-[10px] text-white/30">
        +2 per goal · +3 win · +1 draw · +2 clean sheet — updates live from TxLINE
      </p>
    </main>
  );
}
