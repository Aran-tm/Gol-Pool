import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { ArrowLeft, Copy, Check, Crown, Users, Shield } from "lucide-react";
import {
  getPool,
  getMembers,
  getAssignments,
  getMatches,
  getProfiles,
  subscribeMatches,
  type Pool,
  type Member,
  type Assignment,
} from "../lib/api";
import { memberPoints, teamPoints, POINTS, type MatchRow } from "../lib/scoring";
import { isLive } from "../lib/txline";
import { AnimatedNumber, LiveBadge, Label } from "../components/ui";
import TeamBadge from "../components/TeamBadge";
import Flag from "../components/Flag";
import Avatar from "../components/Avatar";
import TeamReveal from "../components/TeamReveal";
import EmptyState from "../components/EmptyState";

const short = (w: string) => `${w.slice(0, 4)}…${w.slice(-4)}`;

type Tab = "leaderboard" | "my-teams" | "rules";
const TABS: { key: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: "leaderboard", label: "Leaderboard", icon: Crown },
  { key: "my-teams", label: "My Teams", icon: Users },
  { key: "rules", label: "Rules", icon: Shield },
];

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

export default function PoolDetail() {
  const { poolId } = useParams<{ poolId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { publicKey } = useWallet();
  const me = publicKey?.toBase58() ?? "";

  const [tab, setTab] = useState<Tab>("leaderboard");
  const [pool, setPool] = useState<Pool | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Show the team-reveal once when arriving straight from create/join.
  const [reveal, setReveal] = useState(() => Boolean((location.state as { reveal?: boolean } | null)?.reveal));
  const goalsRef = useRef<Map<number, number>>(new Map());

  const loadStatic = useCallback(async () => {
    if (!poolId) return;
    const [p, m, a] = await Promise.all([
      getPool(poolId),
      getMembers(poolId),
      getAssignments(poolId),
    ]);
    setPool(p);
    setMembers(m);
    setAssignments(a);
    setNames(await getProfiles(m.map((x) => x.wallet_address)));
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

  // Goal celebration
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
      setToast(`GOOOAL!  ${scored.name}`);
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
          return {
            wallet: mem.wallet_address,
            points: memberPoints(teams.map((t) => t.id), matches),
            teams,
          };
        })
        .sort((a, b) => b.points - a.points),
    [members, assignments, matches],
  );

  const liveMatches = matches.filter((m) => isLive(m.game_state));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-8 pb-24">
      {/* Team reveal — fires once after creating/joining a pool */}
      <AnimatePresence>
        {reveal && myTeams.length > 0 && (
          <TeamReveal teams={myTeams} onDone={() => setReveal(false)} />
        )}
      </AnimatePresence>

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

      <button
        onClick={() => navigate("/pools")}
        className="mb-5 flex w-fit items-center gap-1 text-sm text-white/60 transition hover:text-white"
      >
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

      {/* Live matches banner */}
      {liveMatches.length > 0 && (
        <div className="mt-4 space-y-1.5 rounded-2xl border border-red-500/30 bg-red-500/[0.06] p-3">
          <LiveBadge />
          {liveMatches.map((m) => (
            <div key={m.fixture_id} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <Flag name={m.home_team} className="text-[13px]" /> {m.home_team}
              </span>
              <span className="font-black tabular-nums text-gold">
                {m.home_goals} – {m.away_goals}
              </span>
              <span className="flex items-center gap-1.5">
                {m.away_team} <Flag name={m.away_team} className="text-[13px]" />
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 flex gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold transition ${
                active
                  ? "bg-grass/20 text-grass"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="mt-5">
        {tab === "leaderboard" && <LeaderboardTab rows={rows} me={me} names={names} liveMatches={liveMatches.length} />}
        {tab === "my-teams" && <MyTeamsTab myTeams={myTeams} matches={matches} />}
        {tab === "rules" && <RulesTab pool={pool} membersCount={members.length} />}
      </div>
    </main>
  );
}

/* ── Tab: Leaderboard ──────────────────────────────────────────────── */

function LeaderboardTab({ rows, me, names, liveMatches }: { rows: Row[]; me: string; names: Map<string, string>; liveMatches: number }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <Label>Leaderboard</Label>
        {liveMatches > 0 ? <LiveBadge /> : <span className="text-xs text-white/30">live</span>}
      </div>
      <div className="mt-3 space-y-2.5">
        {rows.map((r, i) => {
          const isMe = r.wallet === me;
          const name = names.get(r.wallet);
          return (
            <motion.div
              layout
              key={r.wallet}
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
              className={`rounded-2xl border p-4 ${
                isMe
                  ? "border-grass/60 bg-grass/[0.08] shadow-glow"
                  : "border-white/10 bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center text-lg">
                    {i === 0 ? (
                      <Crown className="h-5 w-5 text-gold" />
                    ) : (
                      ["🥈", "🥉"][i - 1] ?? (
                        <span className="text-sm font-bold text-white/40">{i + 1}</span>
                      )
                    )}
                  </span>
                  <Avatar wallet={r.wallet} name={name} size={32} />
                  <span className="text-sm font-semibold">
                    {name ?? short(r.wallet)}
                    {isMe && <span className="ml-1 text-grass">you</span>}
                  </span>
                </div>
                <AnimatedNumber
                  value={r.points}
                  className="text-2xl font-black text-gold tabular-nums"
                />
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1 pl-11">
                {r.teams.map((t) => (
                  <TeamBadge key={t.id} teamName={t.name} size="sm" />
                ))}
              </div>
            </motion.div>
          );
        })}
        {rows.length === 0 && (
          <EmptyState icon={Users} title="No players yet" description="Share the join code to invite friends." />
        )}
      </div>

      <p className="mt-7 text-center text-[11px] text-white/30">
        +{POINTS.goal} goal · +{POINTS.win} win · +{POINTS.draw} draw · +{POINTS.cleanSheet} clean sheet — live from TxLINE
      </p>
    </>
  );
}

/* ── Tab: My Teams ─────────────────────────────────────────────────── */

function MyTeamsTab({ myTeams, matches }: { myTeams: { id: number; name: string }[]; matches: MatchRow[] }) {
  if (myTeams.length === 0) {
    return <EmptyState icon={Shield} title="No teams assigned" description="Join a pool to get your random World Cup teams." />;
  }

  return (
    <div className="space-y-4">
      {myTeams.map((team) => {
        const pts = teamPoints(team.id, matches);
        const teamMatches = matches.filter(
          (m) => m.home_team_id === team.id || m.away_team_id === team.id,
        );
        return (
          <div key={team.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flag name={team.name} className="text-2xl" />
                <span className="font-bold">{team.name}</span>
              </div>
              <span className="text-xl font-black text-gold">{pts} pts</span>
            </div>
            <div className="mt-3 space-y-1">
              {teamMatches.map((m) => {
                const started = m.game_state !== 1;
                return (
                  <div
                    key={m.fixture_id}
                    className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-1.5 text-xs"
                  >
                    <span className="text-white/60">
                      vs {m.home_team_id === team.id ? m.away_team : m.home_team}
                    </span>
                    {started ? (
                      <span className="font-bold tabular-nums text-gold">
                        {m.home_team_id === team.id ? m.home_goals : m.away_goals}
                        <span className="text-white/30">–</span>
                        {m.home_team_id === team.id ? m.away_goals : m.home_goals}
                      </span>
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Tab: Rules ────────────────────────────────────────────────────── */

function RulesTab({ pool, membersCount }: { pool: Pool | null; membersCount: number }) {
  return (
    <div className="space-y-4">
      {/* Pool info */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider">Pool info</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-white/40">Name</span>
            <p className="font-bold">{pool?.name ?? "—"}</p>
          </div>
          <div>
            <span className="text-white/40">Join code</span>
            <p className="font-mono font-bold text-gold">{pool?.join_code ?? "—"}</p>
          </div>
          <div>
            <span className="text-white/40">Players</span>
            <p className="font-bold">{membersCount}</p>
          </div>
          <div>
            <span className="text-white/40">Entry fee</span>
            <p className="font-bold">{pool?.entry_fee ? `${pool.entry_fee} SOL` : "Free"}</p>
          </div>
        </div>
      </div>

      {/* Scoring table */}
      <div className="rounded-2xl border border-white/10">
        <h3 className="px-4 pt-4 text-xs font-bold text-white/50 uppercase tracking-wider">Scoring</h3>
        <div className="mt-2">
          {[
            ["Goal scored", `+${POINTS.goal}`, "Live"],
            ["Win", `+${POINTS.win}`, "Full-time"],
            ["Draw", `+${POINTS.draw}`, "Full-time"],
            ["Clean sheet", `+${POINTS.cleanSheet}`, "Full-time"],
          ].map(([event, pts, when]) => (
            <div
              key={event}
              className="flex items-center justify-between border-b border-white/5 px-4 py-2.5 text-sm last:border-b-0"
            >
              <span>{event}</span>
              <div className="flex items-center gap-4">
                <span className="font-black text-gold">{pts}</span>
                <span className="text-xs text-white/40">{when}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────── */

function goalsForTeam(teamId: number, matches: MatchRow[]): number {
  let g = 0;
  for (const m of matches) {
    if (m.home_team_id === teamId) g += m.home_goals ?? 0;
    if (m.away_team_id === teamId) g += m.away_goals ?? 0;
  }
  return g;
}
