import { useNavigate } from "react-router-dom";
import { isLive, isFinished, GAME_STATE } from "../lib/txline";
import Flag from "./Flag";
import MatchMinute from "./MatchMinute";
import type { MatchRow } from "../lib/scoring";
import { LiveBadge } from "./ui";

interface Props {
  match: MatchRow;
  compact?: boolean;
}

export default function MatchCard({ match, compact }: Props) {
  const navigate = useNavigate();
  const live = isLive(match.game_state);
  const done = isFinished(match.game_state);
  const started = match.game_state !== 1;

  const statusLabel = live
    ? "LIVE"
    : done
      ? "FT"
      : match.game_state === 1
        ? formatKickoff(match.kickoff)
        : GAME_STATE[match.game_state] ?? match.game_state;

  if (compact) {
    return (
      <button
        onClick={() => navigate(`/matches/${match.fixture_id}`)}
        className={`flex shrink-0 items-center gap-2 rounded-xl border bg-white/[0.04] px-3 py-2 transition ${
          live ? "border-red-500/40 animate-live-border" : "border-white/10 hover:border-grass/40"
        }`}
      >
        <span className="flex items-center gap-1.5 text-xs">
          <Flag name={match.home_team} className="text-[13px]" /> {match.home_team}
        </span>
        {started ? (
          <span className="text-xs font-black tabular-nums text-gold">
            {match.home_goals}–{match.away_goals}
          </span>
        ) : (
          <span className="text-[10px] text-white/30">vs</span>
        )}
        <span className="flex items-center gap-1.5 text-xs">
          {match.away_team} <Flag name={match.away_team} className="text-[13px]" />
        </span>
        {live && (
          <>
            <MatchMinute match={match} className="text-[10px] font-bold text-red-400 tabular-nums" />
            <LiveBadge className="!text-[9px] !px-1.5 !py-0" />
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={() => navigate(`/matches/${match.fixture_id}`)}
      className={`flex w-full items-center justify-between rounded-2xl border bg-white/[0.04] p-4 text-left transition ${
        live ? "border-red-500/40 animate-live-border" : "border-white/10 hover:border-grass/40"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <Flag name={match.home_team} className="text-xl" />
        <span className="text-sm font-semibold">{match.home_team}</span>
      </div>

      <div className="flex flex-col items-center gap-0.5">
        {started ? (
          <span className="text-xl font-black tabular-nums text-gold">
            {match.home_goals} <span className="text-white/30">–</span>{" "}
            {match.away_goals}
          </span>
        ) : (
          <span className="text-sm font-bold text-white/30">vs</span>
        )}
        {live ? (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-400">
            <MatchMinute match={match} className="tabular-nums" />
            <LiveBadge className="!px-1.5 !py-0 !text-[8px]" />
          </span>
        ) : (
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider ${
              done ? "text-white/40" : "text-white/30"
            }`}
          >
            {statusLabel}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <span className="text-sm font-semibold">{match.away_team}</span>
        <Flag name={match.away_team} className="text-xl" />
      </div>
    </button>
  );
}

function formatKickoff(kickoff: string | null): string {
  if (!kickoff) return "—";
  const d = new Date(kickoff);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}
