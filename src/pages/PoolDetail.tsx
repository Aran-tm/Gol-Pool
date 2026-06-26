import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { ArrowLeft, Copy, Check, Crown } from "lucide-react";
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
import { isLive } from "../lib/txline";
import { flag } from "../lib/flags";
import { AnimatedNumber, LiveBadge, Label } from "../components/ui";

const short = (w: string) => `${w.slice(0, 4)}…${w.slice(-4)}`;

function celebrate() {
  confetti({
    particleCount: 130,
    spread: 80,
    startVelocity: 45,
    origin: { y: 0.55 },
    colors: ["#22c55e", "#ffd166", "#ffffff", "#0b6e4f"],
  });
}

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
  const [toast, setToast] = useState<string | null>(null);
  const goalsRef = useRef<Map<number, number>>(new Map());

  const loadStatic = useCallback(async () => {
    const [p, m, a] = await Promise.all([getPool(poolId), getMembers(poolId), getAssignments(poolId)]);
    setPool(p);
    setMembers(m);
    setAssignments(a);
  }, [poolId]);
  const loadMatches = useCallback(async () => setMatches(await getMatches()), []);

  useEffect(() => {
    loadStatic();
    loadMatches();
    const unsub = subscribeMatches(loadMatches);
    return unsub;
  }, [loadStatic, loadMatches]);

  const myTeams = useMemo(
    () =>
      assignments
        .filter((a) => a.wallet_address === me)
        .map((a) => ({ id: a.team_id, name: a.team_name })),
    [assignments, me],
  );

  // Goal celebration: when one of my teams' goal tally rises, confetti + toast.
  useEffect(() => {
    if (myTeams.length === 0) return;
    const prev = goalsRef.current;
    const next = new Map<number, number>();
    let scored: { name: string } | null = null;
    for (const t of myTeams) {
      const g = goalsForTeam(t.id, matches);
      next.set(t.id, g);
      if (prev.size > 0 && g > (prev.get(t.id) ?? 0)) scored = { name: t.name };
    }
    goalsRef.current = next;
    if (scored) {
      celebrate();
      setToast(`GOOOAL!  ${flag(scored.name)}  ${scored.name}`);
      const id = setTimeout(() => setToast(null), 3200);
      return () => clearTimeout(id);
    }
  }, [matches, myTeams]);

  const rows: Row[] = useMemo(
    () =>
      members
        .map((mem) => {
          const teams = assignments
            .filter((a) => a.wallet_address === mem.wallet_address)
            .map((a) => ({ id: a.team_id, name: a.team_name }));
          return { wallet: mem.wallet_address, points: memberPoints(teams.map((t) => t.id), matches), teams };
        })
        .sort((a, b) => b.points - a.points),
    [members, assignments, matches],
  );

  const liveMatches = matches.filter((m) => isLive(m.game_state));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-8">
      {/* Goal toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-5 z-50 mx-auto w-fit rounded-2xl border border-grass/50 bg-ink-800/90 px-6 py-3 text-lg font-black text-gradient shadow-glow backdrop-blur-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <button onClick={onBack} className="mb-5 flex w-fit items-center gap-1 text-sm text-white/60 transition hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Pools
      </button>

      <div className="flex items-start justify-between gap-3">
        <h1 className="text-3xl font-black leading-tight">{pool?.name ?? "…"}</h1>
        <button
          onClick={() => {
            if (!pool) return;
            navigator.clipboard.writeText(pool.join_code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-mono"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-grass" /> : <Copy className="h-3.5 w-3.5" />}
          {pool?.join_code ?? "…"}
        </button>
      </div>
      <div className="mt-1 text-sm text-white/40">
        {members.length} player{members.length === 1 ? "" : "s"}
      </div>

      {/* Live matches */}
      {liveMatches.length > 0 && (
        <div className="mt-5 space-y-2 rounded-3xl border border-red-500/30 bg-red-500/[0.06] p-4">
          <LiveBadge />
          {liveMatches.map((m) => (
            <div key={m.fixture_id} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                {flag(m.home_team)} {m.home_team}
              </span>
              <span className="font-black tabular-nums">
                {m.home_goals} <span className="text-white/30">–</span> {m.away_goals}
              </span>
              <span className="flex items-center gap-1.5">
                {m.away_team} {flag(m.away_team)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      <div className="mt-7 flex items-center justify-between">
        <Label>Leaderboard</Label>
        {liveMatches.length > 0 ? <LiveBadge /> : <span className="text-xs text-white/30">live</span>}
      </div>

      <div className="mt-3 space-y-2.5">
        {rows.map((r, i) => {
          const isMe = r.wallet === me;
          return (
            <motion.div
              layout
              key={r.wallet}
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
              className={`rounded-2xl border p-4 ${
                isMe ? "border-grass/60 bg-grass/[0.08] shadow-glow" : "border-white/10 bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center text-lg">
                    {i === 0 ? <Crown className="h-5 w-5 text-gold" /> : ["🥈", "🥉"][i - 1] ?? <span className="text-sm font-bold text-white/40">{i + 1}</span>}
                  </span>
                  <span className="font-mono text-sm">
                    {short(r.wallet)}
                    {isMe && <span className="ml-1 text-grass">you</span>}
                  </span>
                </div>
                <AnimatedNumber value={r.points} className="text-2xl font-black text-gold tabular-nums" />
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1 pl-11">
                {r.teams.map((t) => (
                  <span
                    key={t.id}
                    className="flex items-center gap-1 rounded-lg bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/70"
                  >
                    {flag(t.name)} {t.name}
                  </span>
                ))}
              </div>
            </motion.div>
          );
        })}
        {rows.length === 0 && (
          <p className="glass rounded-2xl p-6 text-center text-sm text-white/50">No players yet.</p>
        )}
      </div>

      <p className="mt-7 text-center text-[11px] text-white/30">
        +2 goal · +3 win · +1 draw · +2 clean sheet — live from TxLINE
      </p>
    </main>
  );
}

/** Total goals scored by a team across matches (for celebration detection). */
function goalsForTeam(teamId: number, matches: MatchRow[]): number {
  let g = 0;
  for (const m of matches) {
    if (m.home_team_id === teamId) g += m.home_goals ?? 0;
    if (m.away_team_id === teamId) g += m.away_goals ?? 0;
  }
  return g;
}
