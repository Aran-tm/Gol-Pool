import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import { Trophy, ChevronRight, Plus, LogIn } from "lucide-react";
import PageTransition from "../components/PageTransition";
import MatchCard from "../components/MatchCard";
import EmptyState from "../components/EmptyState";
import Skeleton, { Shimmer } from "../components/Skeleton";
import PoolCover from "../components/PoolCover";
import { LiveBadge } from "../components/ui";
import { getMyPools, getMatches, subscribeMatches, getPoolMemberCount, type Pool } from "../lib/api";
import { isLive, isStale } from "../lib/txline";
import type { MatchRow } from "../lib/scoring";

interface PoolCard {
  pool: Pool;
  memberCount: number;
}

export default function Dashboard() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? "";
  const navigate = useNavigate();

  const [pools, setPools] = useState<PoolCard[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!wallet) return;
    const [p, m] = await Promise.all([getMyPools(wallet), getMatches()]);
    setMatches(m);

    // Enrich pools with member count.
    const enriched = await Promise.all(
      p.map(async (pool) => {
        let count = 0;
        try {
          count = await getPoolMemberCount(pool.id);
        } catch { /* ignore */ }
        return { pool, memberCount: count };
      }),
    );
    setPools(enriched);
    setLoaded(true);
  }, [wallet]);

  useEffect(() => {
    load();
    const unsub = subscribeMatches(load);
    return unsub;
  }, [load]);

  const liveMatches = matches.filter((m) => isLive(m.game_state));
  const todayMatches = matches.filter((m) => {
    if (!m.kickoff || isStale(m.kickoff, m.game_state)) return false;
    const d = new Date(m.kickoff);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  return (
    <PageTransition className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-8 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <h1 className="text-gradient text-2xl font-black tracking-tight">
            GolPool
          </h1>
        </div>
        <LiveBadge />
      </div>

      {/* Live matches strip */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white/70">Live now</h2>
          <button
            onClick={() => navigate("/matches")}
            className="flex items-center gap-1 text-xs text-white/40 transition hover:text-grass"
          >
            All matches <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {!loaded ? (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
            {[0, 1, 2].map((i) => (
              <Shimmer key={i} className="h-9 w-40 shrink-0 rounded-xl" />
            ))}
          </div>
        ) : liveMatches.length > 0 ? (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
            {liveMatches.map((m) => (
              <MatchCard key={m.fixture_id} match={m} compact />
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-xs text-white/40">
            No live matches right now. Check back when the next match kicks off.
          </p>
        )}
      </section>

      {/* Today's matches */}
      {todayMatches.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-bold text-white/70">Today</h2>
          <div className="mt-3 space-y-2">
            {todayMatches.slice(0, 4).map((m) => (
              <MatchCard key={m.fixture_id} match={m} compact />
            ))}
          </div>
        </section>
      )}

      {/* My pools */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white/70">My pools</h2>
          <button
            onClick={() => navigate("/pools")}
            className="flex items-center gap-1 text-xs text-white/40 transition hover:text-grass"
          >
            View all <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {!loaded ? (
            <Skeleton rows={2} />
          ) : pools.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No pools yet"
              description="Create one or join with a code from a friend."
              action={{ label: "Create a pool", onClick: () => navigate("/pools") }}
            />
          ) : (
            pools.slice(0, 4).map(({ pool, memberCount }, i) => (
              <motion.button
                key={pool.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(`/pools/${pool.id}`)}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-grass/50"
              >
                <PoolCover poolId={pool.id} w={160} h={160} className="h-14 w-14 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{pool.name}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-white/40">
                    <span className="font-mono text-gold">#{pool.join_code}</span>
                    <span>·</span>
                    <span>
                      {memberCount} player{memberCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
              </motion.button>
            ))
          )}
        </div>
      </section>

      {/* Quick actions */}
      <section className="mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate("/pools")}
          className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-grass/50"
        >
          <Plus className="h-5 w-5 text-grass" />
          <span className="text-sm font-semibold">New pool</span>
        </button>
        <button
          onClick={() => navigate("/pools")}
          className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-grass/50"
        >
          <LogIn className="h-5 w-5 text-gold" />
          <span className="text-sm font-semibold">Join pool</span>
        </button>
      </section>
    </PageTransition>
  );
}
