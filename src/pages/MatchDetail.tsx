import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { ArrowLeft, Clock } from "lucide-react";
import PageTransition from "../components/PageTransition";
import { LiveBadge } from "../components/ui";
import { Shimmer } from "../components/Skeleton";
import MatchMinute from "../components/MatchMinute";
import { supabase } from "../lib/supabase";
import { getMatches } from "../lib/api";
import { isLive, isFinished, GAME_STATE } from "../lib/txline";
import Flag from "../components/Flag";
import type { MatchRow } from "../lib/scoring";

interface MatchEvent {
  id: number;
  fixture_id: number;
  team_id: number;
  type: string;
  minute: number | null;
  seq: number | null;
  payload: unknown;
  created_at: string;
}

// GolPool green/gold burst — matches the reveal & champion celebrations.
function celebrateGoal() {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  confetti({
    particleCount: 130,
    spread: 80,
    startVelocity: 45,
    origin: { y: 0.55 },
    colors: ["#22c55e", "#ffd166", "#ffffff", "#0b6e4f"],
  });
}

export default function MatchDetail() {
  const { fixtureId } = useParams<{ fixtureId: string }>();
  const navigate = useNavigate();
  const fid = Number(fixtureId);

  const [match, setMatch] = useState<MatchRow | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Goal count already on screen. null until the first load so we never celebrate
  // pre-existing goals when you open a match that's already in progress.
  const seenGoals = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!fid) return;
    try {
      const matches = await getMatches();
      const m = matches.find((x) => x.fixture_id === fid) ?? null;
      setMatch(m);

      // Load goal events from Supabase.
      const { data, error: supaError } = await supabase
        .from("match_events")
        .select("*")
        .eq("fixture_id", fid)
        .order("seq", { ascending: true });
      if (supaError) throw supaError;
      setEvents((data ?? []) as MatchEvent[]);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [fid]);

  useEffect(() => {
    load();
    // Subscribe to new events.
    const channel = supabase
      .channel(`match-${fid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_events", filter: `fixture_id=eq.${fid}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, fid]);

  // Fire confetti once per goal that lands while you're watching (not on the
  // goals that were already there when the page loaded).
  useEffect(() => {
    const goals = events.filter((e) => e.type === "goal").length;
    if (seenGoals.current !== null && goals > seenGoals.current) celebrateGoal();
    seenGoals.current = goals;
  }, [events]);

  // A new match id reuses this component — reset so its existing goals don't celebrate.
  useEffect(() => {
    seenGoals.current = null;
  }, [fid]);

  if (loading) {
    return (
      <PageTransition className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-8 pb-nav">
        <Shimmer className="mb-5 h-4 w-20 rounded" />
        {/* Mirrors the score hero below so nothing jumps when data lands. */}
        <div className="glass rounded-3xl p-6">
          <Shimmer className="mx-auto h-5 w-16 rounded-full" />
          <div className="mt-3 flex items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <Shimmer className="h-10 w-10 rounded-full" />
              <Shimmer className="h-4 w-16 rounded" />
            </div>
            <Shimmer className="h-12 w-20 rounded-xl" />
            <div className="flex flex-col items-center gap-2">
              <Shimmer className="h-10 w-10 rounded-full" />
              <Shimmer className="h-4 w-16 rounded" />
            </div>
          </div>
          <Shimmer className="mx-auto mt-3 h-3 w-24 rounded" />
        </div>
      </PageTransition>
    );
  }

  if (!match) {
    return (
      <PageTransition className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-8 pb-nav">
        <p className="mt-20 text-center text-white/40">{error || "Match not found."}</p>
      </PageTransition>
    );
  }

  const live = isLive(match.game_state);
  const done = isFinished(match.game_state);
  const stateLabel = GAME_STATE[match.game_state] ?? match.game_state;

  return (
    <PageTransition className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-8 pb-nav">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="mb-5 flex w-fit items-center gap-1 text-sm text-white/60 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Matches
      </button>

      {/* Score hero */}
      <div className="glass rounded-3xl p-6 text-center">
        <div className="flex items-center justify-center gap-2">
          {live && (
            <>
              <LiveBadge />
              <MatchMinute match={match} className="text-sm font-black tabular-nums text-red-400" />
            </>
          )}
          {done && (
            <span className="rounded-full border border-white/20 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/50">
              FT
            </span>
          )}
          {!live && !done && (
            <span className="rounded-full border border-white/20 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/50">
              {match.kickoff
                ? new Date(match.kickoff).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })
                : "TBD"}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-center gap-6">
          {/* Home */}
          <div className="flex flex-col items-center gap-2">
            <Flag name={match.home_team} className="text-4xl" />
            <span className="text-sm font-bold">{match.home_team}</span>
          </div>

          {/* Score */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-5xl font-black tabular-nums text-gold">
              {match.home_goals}
            </span>
            <span className="text-3xl font-light text-white/25">–</span>
            <span className="text-5xl font-black tabular-nums text-gold">
              {match.away_goals}
            </span>
          </div>

          {/* Away */}
          <div className="flex flex-col items-center gap-2">
            <Flag name={match.away_team} className="text-4xl" />
            <span className="text-sm font-bold">{match.away_team}</span>
          </div>
        </div>

        <p className="mt-2 text-xs text-white/40">{stateLabel}</p>
      </div>

      {/* Match stats (corners + cards — TxLINE's soccer feed) */}
      <MatchStats match={match} />

      {/* Timeline */}
      <section className="mt-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white/70">
          <Clock className="h-4 w-4" /> Goal timeline
        </h2>

        {events.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-xs text-white/40">
            {match.game_state === 1
              ? "Match hasn't started yet."
              : "No goals recorded yet."}
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {events
              .filter((e) => e.type === "goal")
              .map((e, i) => {
                const teamName =
                  (e.payload as Record<string, unknown>)?.team ??
                  (e.team_id === match.home_team_id
                    ? match.home_team
                    : match.away_team);
                return (
                  <div
                    key={e.id ?? i}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-grass/20 text-xs font-black text-grass">
                      ⚽
                    </span>
                    <div className="flex-1">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                        <Flag name={String(teamName)} className="text-[13px]" /> {String(teamName)}
                      </span>
                      <span className="ml-2 text-xs text-white/40">scores</span>
                    </div>
                    {e.minute != null && (
                      <span className="font-mono text-xs font-bold text-white/50">
                        {e.minute}&apos;
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {/* Match info */}
      <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-white/40">Competition</span>
            <p className="font-semibold">World Cup 2026</p>
          </div>
          <div>
            <span className="text-white/40">Fixture ID</span>
            <p className="font-mono font-semibold">{match.fixture_id}</p>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}

/* ── Match stats (corners + cards) ─────────────────────────────────── */

function MatchStats({ match }: { match: MatchRow }) {
  const stats = [
    { label: "Corners", h: match.home_corners ?? 0, a: match.away_corners ?? 0 },
    { label: "Yellow cards", h: match.home_yellows ?? 0, a: match.away_yellows ?? 0, color: "bg-gold" },
    { label: "Red cards", h: match.home_reds ?? 0, a: match.away_reds ?? 0, color: "bg-red-500" },
  ];
  const hasData = stats.some((s) => s.h > 0 || s.a > 0);
  if (!hasData) return null;

  return (
    <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <h2 className="text-sm font-bold text-white/70">Match stats</h2>
      <div className="mt-3 space-y-3">
        {stats.map((s) => (
          <StatBar key={s.label} {...s} />
        ))}
      </div>
      <p className="mt-3 text-[10px] text-white/30">Live corners &amp; cards from TxLINE.</p>
    </section>
  );
}

function StatBar({ label, h, a, color = "bg-grass" }: { label: string; h: number; a: number; color?: string }) {
  const total = h + a;
  const homePct = total === 0 ? 50 : (h / total) * 100;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-black tabular-nums text-white">{h}</span>
        <span className="text-white/50">{label}</span>
        <span className="font-black tabular-nums text-white">{a}</span>
      </div>
      <div className="mt-1 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
        <div className={`${color} rounded-l-full opacity-90`} style={{ width: `${homePct}%` }} />
        <div className="flex-1 rounded-r-full bg-white/15" />
      </div>
    </div>
  );
}
