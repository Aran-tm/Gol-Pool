import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { HelpCircle, RefreshCw, Trophy, Users, Star } from "lucide-react";
import PageTransition from "../components/PageTransition";
import { getMyPools, getMatches, getAssignments, updateDisplayName, type Assignment } from "../lib/api";
import { memberPoints } from "../lib/scoring";
import { flag } from "../lib/flags";
import Avatar from "../components/Avatar";
import Skeleton from "../components/Skeleton";

const short = (w: string) => `${w.slice(0, 4)}…${w.slice(-4)}`;

export default function Profile() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? "";
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ pools: 0, points: 0, bestTeam: "", totalTeams: 0 });
  const [loaded, setLoaded] = useState(false);

  const loadStats = useCallback(async () => {
    if (!wallet) return;
    try {
      const [pools, matches, allAssignments] = await Promise.all([
        getMyPools(wallet),
        getMatches(),
        // Fetch assignments for all pools the user is in.
        (async () => {
          const p = await getMyPools(wallet);
          const all: Assignment[] = [];
          for (const pool of p) {
            try {
              const a = await getAssignments(pool.id);
              all.push(...a.filter((x) => x.wallet_address === wallet));
            } catch { /* skip */ }
          }
          return all;
        })(),
      ]);

      const myTeamIds = allAssignments.map((a) => a.team_id);
      const pts = memberPoints(myTeamIds, matches);

      // Best performing team.
      let bestTeam = "";
      let bestPts = 0;
      for (const t of myTeamIds) {
        const tp = memberPoints([t], matches);
        if (tp > bestPts) {
          bestPts = tp;
          bestTeam = allAssignments.find((a) => a.team_id === t)?.team_name ?? "";
        }
      }

      setStats({
        pools: pools.length,
        points: pts,
        bestTeam,
        totalTeams: myTeamIds.length,
      });
    } catch { /* ignore */ } finally {
      setLoaded(true);
    }
  }, [wallet]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  async function handleSaveName() {
    if (!displayName.trim() || !wallet) return;
    setSaving(true);
    try {
      await updateDisplayName(wallet, displayName.trim());
      setEditing(false);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  function handleReplayOnboarding() {
    localStorage.removeItem("golpool_onboarded");
    navigate("/onboarding");
  }

  return (
    <PageTransition className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-8 pb-24">
      <h1 className="text-2xl font-black">Profile</h1>

      {/* Identity */}
      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center gap-4">
          <Avatar wallet={wallet} name={displayName} size={56} className="!rounded-2xl" />
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name"
                  className="field flex-1 !py-2"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setEditing(false);
                  }}
                />
                <button
                  onClick={handleSaveName}
                  disabled={saving}
                  className="btn-ghost !px-3 !py-2 text-xs"
                >
                  {saving ? "…" : "Save"}
                </button>
              </div>
            ) : (
              <>
                <div className="font-bold">
                  {displayName || "Anonymous Player"}
                </div>
                <button
                  onClick={() => {
                    setDisplayName(displayName);
                    setEditing(true);
                  }}
                  className="mt-0.5 text-xs text-white/40 transition hover:text-grass"
                >
                  Set display name
                </button>
              </>
            )}
            <div className="mt-1 font-mono text-[10px] text-white/40">
              {short(wallet)}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      {!loaded ? (
        <Skeleton rows={1} className="mt-4 [&>div]:h-[88px]" />
      ) : (
        <section className="mt-4 grid grid-cols-3 gap-3">
          {[
            { icon: Trophy, label: "Pools", value: stats.pools },
            { icon: Star, label: "Points", value: stats.points },
            { icon: Users, label: "Teams", value: stats.totalTeams },
          ].map((s) => (
            <div
              key={s.label}
              className="glass flex flex-col items-center gap-1 rounded-2xl px-2 py-4"
            >
              <s.icon className="h-4 w-4 text-grass" />
              <span className="text-xl font-black text-gold">{s.value}</span>
              <span className="text-[10px] uppercase tracking-wide text-white/50">
                {s.label}
              </span>
            </div>
          ))}
        </section>
      )}

      {loaded && stats.bestTeam && (
        <div className="mt-3 rounded-2xl border border-gold/20 bg-gold/[0.04] p-4 text-center">
          <p className="text-xs text-white/50">Best performing team</p>
          <p className="mt-1 text-sm font-bold text-gold">
            {flag(stats.bestTeam)} {stats.bestTeam}
          </p>
        </div>
      )}

      {/* Links */}
      <section className="mt-6 space-y-2">
        <button
          onClick={() => navigate("/profile/how-to-play")}
          className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-white/30"
        >
          <HelpCircle className="h-5 w-5 text-white/50" />
          <span className="text-sm font-semibold">How to Play</span>
        </button>

        <button
          onClick={handleReplayOnboarding}
          className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-white/30"
        >
          <RefreshCw className="h-5 w-5 text-white/50" />
          <span className="text-sm font-semibold">Show intro again</span>
        </button>
      </section>

      <p className="mt-auto pt-8 text-center text-[10px] text-white/25">
        Powered by TxLINE · Built on Solana
      </p>
    </PageTransition>
  );
}
