// GolPool scoring — computed client-side from matches + a member's assigned teams.
// Goals score live (+2 each) for constant leaderboard movement; win/draw/clean-sheet
// bonuses apply once a match is finished.

import { isFinished } from "./txline";

export interface MatchRow {
  fixture_id: number;
  home_team_id: number;
  home_team: string;
  away_team_id: number;
  away_team: string;
  game_state: number;
  home_goals: number;
  away_goals: number;
  kickoff: string | null;
}

export const POINTS = {
  goal: 2,
  win: 3,
  draw: 1,
  cleanSheet: 2,
} as const;

/** Points a single team has earned across all matches so far. */
export function teamPoints(teamId: number, matches: MatchRow[]): number {
  let pts = 0;
  for (const m of matches) {
    if (m.game_state === 1) continue; // not started
    const home = m.home_team_id === teamId;
    const away = m.away_team_id === teamId;
    if (!home && !away) continue;

    const gf = home ? m.home_goals : m.away_goals;
    const ga = home ? m.away_goals : m.home_goals;
    pts += (gf ?? 0) * POINTS.goal;

    if (isFinished(m.game_state)) {
      if (gf > ga) pts += POINTS.win;
      else if (gf === ga) pts += POINTS.draw;
      if (ga === 0) pts += POINTS.cleanSheet;
    }
  }
  return pts;
}

/** Total points for a member who owns several teams. */
export function memberPoints(teamIds: number[], matches: MatchRow[]): number {
  return teamIds.reduce((sum, id) => sum + teamPoints(id, matches), 0);
}

/** Distinct teams appearing in the fixtures, for sweepstake assignment. */
export function distinctTeams(matches: MatchRow[]): { id: number; name: string }[] {
  const map = new Map<number, string>();
  for (const m of matches) {
    map.set(m.home_team_id, m.home_team);
    map.set(m.away_team_id, m.away_team);
  }
  return [...map.entries()].map(([id, name]) => ({ id, name }));
}
