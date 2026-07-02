import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { ArrowLeft, Copy, Check, Crown, Users, Shield, Radio, Lock, Unlock, Trash2 } from "lucide-react";
import {
  getPool,
  getMembers,
  getAssignments,
  getMatches,
  getProfiles,
  getGoalEvents,
  setPoolStatus,
  deletePool,
  subscribeMatches,
  subscribeEvents,
  type Pool,
  type Member,
  type Assignment,
  type GoalEvent,
  type ProfileInfo,
} from "../lib/api";
import { memberPoints, teamPoints, POINTS, type MatchRow } from "../lib/scoring";
import { isLive, isFinished } from "../lib/txline";
import { AnimatedNumber, LiveBadge, Label, Spinner } from "../components/ui";
import { Shimmer } from "../components/Skeleton";
import TeamBadge from "../components/TeamBadge";
import Flag from "../components/Flag";
import MatchMinute from "../components/MatchMinute";
import Avatar from "../components/Avatar";
import PoolCover from "../components/PoolCover";
import TeamReveal from "../components/TeamReveal";
import ChampionCelebration from "../components/ChampionCelebration";
import EmptyState from "../components/EmptyState";

const short = (w: string) => `${w.slice(0, 4)}…${w.slice(-4)}`;
const nameOf = (wallet: string, names: Map<string, ProfileInfo>) =>
  names.get(wallet)?.display_name ?? short(wallet);
const avatarOf = (wallet: string, names: Map<string, ProfileInfo>) =>
  names.get(wallet)?.avatar_url ?? undefined;

type Tab = "leaderboard" | "feed" | "my-teams" | "rules";
const TABS: { key: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: "leaderboard", label: "Table", icon: Crown },
  { key: "feed", label: "Feed", icon: Radio },
  { key: "my-teams", label: "Teams", icon: Users },
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
  const [names, setNames] = useState<Map<string, ProfileInfo>>(new Map());
  const [feed, setFeed] = useState<GoalEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<"lock" | "delete" | "">("");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Transient per-wallet point bumps → floating "+N" + gold flash on the leaderboard.
  const [bumps, setBumps] = useState<Map<string, { delta: number; key: number }>>(new Map());
  const [champ, setChamp] = useState<Row | null>(null);
  // Show the team-reveal once when arriving straight from create/join.
  const [reveal, setReveal] = useState(() => Boolean((location.state as { reveal?: boolean } | null)?.reveal));
  const goalsRef = useRef<Map<number, number>>(new Map());
  const pointsRef = useRef<Map<string, number>>(new Map());
  const bumpKey = useRef(0);

  const loadStatic = useCallback(async () => {
    if (!poolId) return;
    try {
      const [p, m, a] = await Promise.all([
        getPool(poolId),
        getMembers(poolId),
        getAssignments(poolId),
      ]);
      setPool(p);
      setMembers(m);
      setAssignments(a);
      setNames(await getProfiles(m.map((x) => x.wallet_address)));
    } finally {
      setLoaded(true); // clear the skeleton even if a fetch failed
    }
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

  // Team → owner wallet, and the fixtures relevant to this pool (for the feed).
  const teamOwner = useMemo(() => {
    const m = new Map<number, string>();
    for (const a of assignments) m.set(a.team_id, a.wallet_address);
    return m;
  }, [assignments]);
  const poolFixtureIds = useMemo(() => {
    const teamIds = new Set(assignments.map((a) => a.team_id));
    return matches.filter((mt) => teamIds.has(mt.home_team_id) || teamIds.has(mt.away_team_id)).map((mt) => mt.fixture_id);
  }, [assignments, matches]);

  // Load + live-subscribe the goal feed for this pool's fixtures.
  const loadFeed = useCallback(async () => {
    setFeed(await getGoalEvents(poolFixtureIds));
  }, [poolFixtureIds]);
  useEffect(() => {
    loadFeed();
    const unsub = subscribeEvents(loadFeed);
    return unsub;
  }, [loadFeed]);

  // Detect point increases per wallet → floating "+N" + gold flash.
  useEffect(() => {
    const prev = pointsRef.current;
    const next = new Map<string, number>();
    const fresh = new Map<string, { delta: number; key: number }>();
    for (const r of rows) {
      next.set(r.wallet, r.points);
      const before = prev.get(r.wallet);
      if (before != null && r.points > before) {
        fresh.set(r.wallet, { delta: r.points - before, key: ++bumpKey.current });
      }
    }
    pointsRef.current = next;
    if (fresh.size > 0) {
      setBumps(fresh);
      const id = setTimeout(() => setBumps(new Map()), 1700);
      return () => clearTimeout(id);
    }
  }, [rows]);

  // Champion: once every relevant match is finished and there's a clear leader.
  useEffect(() => {
    if (!poolId || rows.length === 0) return;
    const relevant = matches.filter((mt) => poolFixtureIds.includes(mt.fixture_id) && mt.game_state !== 1);
    if (relevant.length === 0 || !relevant.every((mt) => isFinished(mt.game_state))) return;
    if (rows[0].points <= 0) return;
    if (localStorage.getItem(`golpool_champ_${poolId}`)) return;
    localStorage.setItem(`golpool_champ_${poolId}`, "1");
    setChamp(rows[0]);
  }, [rows, matches, poolFixtureIds, poolId]);

  const isOwner = !!pool && pool.owner_wallet === me;

  async function handleToggleLock() {
    if (!pool || busy) return;
    setBusy("lock");
    try {
      await setPoolStatus(pool.id, me, pool.status === "open" ? "locked" : "open");
      await loadStatic();
    } catch (e) {
      console.warn("toggle lock:", e);
    } finally {
      setBusy("");
    }
  }

  async function handleDelete() {
    if (!pool || busy) return;
    setBusy("delete");
    try {
      await deletePool(pool.id, me);
      navigate("/pools", { replace: true }); // unmounts — no need to clear busy
    } catch (e) {
      console.warn("delete pool:", e);
      setBusy("");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-8 pb-24">
      {/* Team reveal — fires once after creating/joining a pool */}
      <AnimatePresence>
        {reveal && myTeams.length > 0 && (
          <TeamReveal teams={myTeams} onDone={() => setReveal(false)} />
        )}
      </AnimatePresence>

      {/* Champion celebration — fires once when the pool finishes */}
      <AnimatePresence>
        {champ && (
          <ChampionCelebration
            name={nameOf(champ.wallet, names)}
            wallet={champ.wallet}
            avatarUrl={avatarOf(champ.wallet, names)}
            points={champ.points}
            poolName={pool?.name ?? "Pool"}
            onDone={() => setChamp(null)}
          />
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
        className="mb-4 flex w-fit items-center gap-1 text-sm text-white/60 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Pools
      </button>

      {!loaded ? (
        <>
          {/* Header skeleton — mirrors the cover, title, code and player count. */}
          <Shimmer className="mb-4 h-24 rounded-2xl" />
          <div className="flex items-start justify-between gap-3">
            <Shimmer className="h-9 w-44 rounded-lg" />
            <Shimmer className="h-9 w-24 shrink-0 rounded-xl" />
          </div>
          <Shimmer className="mt-2 h-4 w-20 rounded" />
        </>
      ) : (
        <>
          {/* Cover banner */}
          {pool && (
            <div className="relative mb-4 h-24 overflow-hidden rounded-2xl border border-white/10">
              <PoolCover poolId={pool.id} w={800} h={240} className="h-full w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/30 to-transparent" />
              {pool.status && pool.status !== "open" && (
                <span className="absolute right-2 top-2 rounded-full border border-white/20 bg-ink-950/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/70">
                  Locked
                </span>
              )}
            </div>
          )}

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
        </>
      )}

      {/* Live matches banner */}
      {liveMatches.length > 0 && (
        <div className="mt-4 space-y-1.5 rounded-2xl border border-red-500/30 bg-red-500/[0.06] p-3">
          <LiveBadge />
          {liveMatches.map((m) => (
            <div key={m.fixture_id} className="flex items-center justify-between text-xs">
              <span className="flex flex-1 items-center gap-1.5">
                <Flag name={m.home_team} className="text-[13px]" /> {m.home_team}
              </span>
              <span className="flex flex-col items-center leading-tight">
                <span className="font-black tabular-nums text-gold">
                  {m.home_goals} – {m.away_goals}
                </span>
                <MatchMinute match={m} className="text-[9px] font-bold text-red-400 tabular-nums" />
              </span>
              <span className="flex flex-1 items-center justify-end gap-1.5">
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
        {!loaded ? (
          // ponytail: one list-shaped skeleton covers the initial static+feed load;
          // the per-tab empty states stay honest once data lands.
          <div className="space-y-2.5">
            <Shimmer className="h-5 w-28 rounded" />
            {[0, 1, 2, 3, 4].map((i) => (
              <Shimmer key={i} className="h-14 rounded-2xl border border-white/10" />
            ))}
          </div>
        ) : (
          <>
            {tab === "leaderboard" && <LeaderboardTab rows={rows} me={me} names={names} bumps={bumps} liveMatches={liveMatches.length} />}
            {tab === "feed" && <FeedTab feed={feed} teamOwner={teamOwner} names={names} />}
            {tab === "my-teams" && <MyTeamsTab myTeams={myTeams} matches={matches} />}
            {tab === "rules" && (
              <RulesTab
                pool={pool}
                membersCount={members.length}
                isOwner={isOwner}
                busy={busy}
                onToggleLock={handleToggleLock}
                onDelete={handleDelete}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

/* ── Tab: Leaderboard ──────────────────────────────────────────────── */

function LeaderboardTab({
  rows,
  me,
  names,
  bumps,
  liveMatches,
}: {
  rows: Row[];
  me: string;
  names: Map<string, ProfileInfo>;
  bumps: Map<string, { delta: number; key: number }>;
  liveMatches: number;
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <Label>Leaderboard</Label>
        {liveMatches > 0 ? <LiveBadge /> : <span className="text-xs text-white/30">live</span>}
      </div>

      {rows.length >= 3 && <Podium rows={rows} names={names} me={me} />}

      <div className="mt-3 space-y-2.5">
        {rows.map((r, i) => {
          const isMe = r.wallet === me;
          const name = names.get(r.wallet)?.display_name ?? undefined;
          const avatar = names.get(r.wallet)?.avatar_url ?? undefined;
          const bump = bumps.get(r.wallet);
          return (
            <motion.div
              layout
              key={r.wallet}
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
              className={`relative overflow-hidden rounded-2xl border p-4 transition-colors duration-500 ${
                bump
                  ? "border-gold/70 bg-gold/[0.14] shadow-gold"
                  : isMe
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
                  <Avatar wallet={r.wallet} name={name} src={avatar} size={32} />
                  <span className="text-sm font-semibold">
                    {name ?? short(r.wallet)}
                    {isMe && <span className="ml-1 text-grass">you</span>}
                  </span>
                </div>
                <div className="relative">
                  <AnimatedNumber
                    value={r.points}
                    className="text-2xl font-black text-gold tabular-nums"
                  />
                  {bump && (
                    <span
                      key={bump.key}
                      className="animate-float-up pointer-events-none absolute -top-1 right-0 text-sm font-black text-grass"
                    >
                      +{bump.delta}
                    </span>
                  )}
                </div>
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

/* ── Podium (top 3) ────────────────────────────────────────────────── */

function Podium({ rows, names, me }: { rows: Row[]; names: Map<string, ProfileInfo>; me: string }) {
  // Visual order: 2nd, 1st, 3rd.
  const slots = [
    { r: rows[1], place: 2, h: "h-16", ring: "ring-white/30", medal: "🥈" },
    { r: rows[0], place: 1, h: "h-24", ring: "ring-gold/70", medal: "🥇" },
    { r: rows[2], place: 3, h: "h-12", ring: "ring-amber-700/60", medal: "🥉" },
  ];
  return (
    <div className="mt-4 flex items-end justify-center gap-2 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
      {slots.map(({ r, place, h, ring, medal }) => (
        <div key={place} className="flex flex-1 flex-col items-center">
          <span className="mb-1 text-lg">{medal}</span>
          <div className={`rounded-full ring-2 ${ring}`}>
            <Avatar wallet={r.wallet} name={nameOf(r.wallet, names)} src={avatarOf(r.wallet, names)} size={place === 1 ? 52 : 40} />
          </div>
          <span className="mt-1.5 max-w-[6.5rem] truncate text-center text-xs font-semibold">
            {nameOf(r.wallet, names)}
            {r.wallet === me && <span className="ml-1 text-grass">you</span>}
          </span>
          <span className="text-sm font-black tabular-nums text-gold">{r.points}</span>
          <div
            className={`mt-1.5 w-full rounded-t-lg bg-gradient-to-t from-white/5 to-white/15 ${h} ${
              place === 1 ? "shadow-gold" : ""
            }`}
          />
        </div>
      ))}
    </div>
  );
}

/* ── Tab: Feed ─────────────────────────────────────────────────────── */

function FeedTab({
  feed,
  teamOwner,
  names,
}: {
  feed: GoalEvent[];
  teamOwner: Map<number, string>;
  names: Map<string, ProfileInfo>;
}) {
  const owned = feed.filter((e) => teamOwner.has(e.team_id));
  if (owned.length === 0) {
    return (
      <EmptyState
        icon={Radio}
        title="No goals yet"
        description="When a team in this pool scores, it shows up here — live."
      />
    );
  }
  return (
    <>
      <div className="flex items-center justify-between">
        <Label>Live feed</Label>
        <span className="text-xs text-white/30">most recent</span>
      </div>
      <div className="mt-3 space-y-2">
        {owned.map((e) => {
          const owner = teamOwner.get(e.team_id) ?? "";
          return (
            <motion.div
              layout
              key={e.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-grass/20 text-sm">⚽</span>
              <div className="flex-1 text-sm">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <Flag name={e.team_name} className="text-[13px]" /> {e.team_name}
                </span>
                <span className="text-white/40"> scored — </span>
                <span className="font-semibold text-white/80">{nameOf(owner, names)}</span>
              </div>
              <span className="text-sm font-black text-grass">+{POINTS.goal}</span>
            </motion.div>
          );
        })}
      </div>
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

function RulesTab({
  pool,
  membersCount,
  isOwner,
  busy,
  onToggleLock,
  onDelete,
}: {
  pool: Pool | null;
  membersCount: number;
  isOwner: boolean;
  busy: "lock" | "delete" | "";
  onToggleLock: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const locked = pool?.status && pool.status !== "open";
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

      {/* Danger zone — owner only */}
      {isOwner && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.04] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-red-300/80">Owner controls</h3>
          <div className="mt-3 space-y-2">
            <button
              onClick={onToggleLock}
              disabled={!!busy}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left text-sm font-semibold transition hover:border-white/30 disabled:opacity-50"
            >
              {busy === "lock" ? (
                <Spinner className="text-white/70" />
              ) : locked ? (
                <Unlock className="h-4 w-4 text-grass" />
              ) : (
                <Lock className="h-4 w-4 text-gold" />
              )}
              {busy === "lock"
                ? locked
                  ? "Reopening…"
                  : "Closing…"
                : locked
                  ? "Reopen pool (allow new players)"
                  : "Close pool (no new players)"}
            </button>

            {confirming ? (
              <div className="rounded-xl border border-red-500/40 bg-red-500/[0.08] p-3">
                <p className="text-sm font-semibold text-red-200">Delete this pool for everyone?</p>
                <p className="mt-0.5 text-xs text-white/50">This can't be undone.</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={onDelete}
                    disabled={busy === "delete"}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
                  >
                    {busy === "delete" ? (
                      <>
                        <Spinner /> Deleting…
                      </>
                    ) : (
                      "Yes, delete"
                    )}
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    disabled={busy === "delete"}
                    className="flex-1 rounded-xl border border-white/15 bg-white/5 py-2 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-40"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="flex w-full items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/[0.06] p-3 text-left text-sm font-semibold text-red-300 transition hover:border-red-500/60"
              >
                <Trash2 className="h-4 w-4" />
                Delete pool
              </button>
            )}
          </div>
        </div>
      )}
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
