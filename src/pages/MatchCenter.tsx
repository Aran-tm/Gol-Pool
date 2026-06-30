import { useEffect, useState, useCallback, useMemo } from "react";
import PageTransition from "../components/PageTransition";
import MatchCard from "../components/MatchCard";
import EmptyState from "../components/EmptyState";
import Skeleton from "../components/Skeleton";
import { getMatches, subscribeMatches } from "../lib/api";
import { isLive, isFinished } from "../lib/txline";
import type { MatchRow } from "../lib/scoring";
import { Radio } from "lucide-react";

type Filter = "all" | "live" | "upcoming" | "finished";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "finished", label: "Finished" },
];

export default function MatchCenter() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setMatches(await getMatches());
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
    const unsub = subscribeMatches(load);
    return unsub;
  }, [load]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "live":
        return matches.filter((m) => isLive(m.game_state));
      case "upcoming":
        return matches.filter((m) => m.game_state === 1);
      case "finished":
        return matches.filter((m) => isFinished(m.game_state));
      default:
        return matches;
    }
  }, [matches, filter]);

  // Group by matchday (simple: by date string).
  const grouped = useMemo(() => {
    const map = new Map<string, MatchRow[]>();
    for (const m of filtered) {
      const key = m.kickoff
        ? new Date(m.kickoff).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })
        : "TBD";
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [filtered]);

  const counts = useMemo(() => {
    const live = matches.filter((m) => isLive(m.game_state)).length;
    const finished = matches.filter((m) => isFinished(m.game_state)).length;
    return { live, finished };
  }, [matches]);

  return (
    <PageTransition className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-8 pb-24">
      <h1 className="text-2xl font-black">Matches</h1>

      {/* Filter tabs */}
      <div className="no-scrollbar mt-4 flex gap-1.5 overflow-x-auto">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          let badge: string | null = null;
          if (f.key === "live" && counts.live > 0) badge = String(counts.live);
          if (f.key === "finished" && counts.finished > 0) badge = String(counts.finished);

          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                active
                  ? "border-grass/60 bg-grass/15 text-grass"
                  : "border-white/10 bg-white/[0.04] text-white/50 hover:text-white/80"
              }`}
            >
              {f.label}
              {badge && (
                <span className={`rounded-full px-1.5 py-0 text-[10px] font-bold ${active ? "bg-grass/30" : "bg-white/10"}`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Match list */}
      <div className="mt-5 space-y-6">
        {!loaded ? (
          <Skeleton rows={5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Radio}
            title={`No ${filter} matches`}
            description={
              filter === "live"
                ? "No matches are currently live. Check back during match time."
                : filter === "finished"
                  ? "No matches have finished yet."
                  : "No matches found."
            }
          />
        ) : (
          grouped.map(([date, list]) => (
            <div key={date}>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/35">
                {date}
              </h3>
              <div className="space-y-2">
                {list.map((m) => (
                  <MatchCard key={m.fixture_id} match={m} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </PageTransition>
  );
}
