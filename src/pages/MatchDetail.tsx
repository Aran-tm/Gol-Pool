import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import PageTransition from "../components/PageTransition";
import { LiveBadge } from "../components/ui";
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

export default function MatchDetail() {
  const { fixtureId } = useParams<{ fixtureId: string }>();
  const navigate = useNavigate();
  const fid = Number(fixtureId);

  const [match, setMatch] = useState<MatchRow | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!fid) return;
    const matches = await getMatches();
    const m = matches.find((x) => x.fixture_id === fid) ?? null;
    setMatch(m);

    // Load goal events from Supabase.
    const { data } = await supabase
      .from("match_events")
      .select("*")
      .eq("fixture_id", fid)
      .order("seq", { ascending: true });
    setEvents((data ?? []) as MatchEvent[]);
    setLoading(false);
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

  if (loading) {
    return (
      <PageTransition className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-8 pb-24">
        <div className="glass mt-20 flex flex-col items-center gap-4 rounded-3xl p-10">
          <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
          <div className="h-8 w-48 animate-pulse rounded bg-white/10" />
        </div>
      </PageTransition>
    );
  }

  if (!match) {
    return (
      <PageTransition className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-8 pb-24">
        <p className="mt-20 text-center text-white/40">Match not found.</p>
      </PageTransition>
    );
  }

  const live = isLive(match.game_state);
  const done = isFinished(match.game_state);
  const stateLabel = GAME_STATE[match.game_state] ?? match.game_state;

  return (
    <PageTransition className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-8 pb-24">
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
