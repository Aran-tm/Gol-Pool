import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import { Plus, LogIn, ChevronRight, Trophy, Users } from "lucide-react";
import { createPool, joinPool, getMyPools, getPoolMemberCount, type Pool } from "../lib/api";
import { Label } from "../components/ui";
import EmptyState from "../components/EmptyState";
import PageTransition from "../components/PageTransition";

interface PoolCard {
  pool: Pool;
  memberCount: number;
}

export default function Pools() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? "";
  const navigate = useNavigate();

  const [pools, setPools] = useState<PoolCard[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    if (!wallet) return;
    try {
      const p = await getMyPools(wallet);
      const enriched = await Promise.all(
        p.map(async (pool) => {
          let memberCount = 0;
          try {
            memberCount = await getPoolMemberCount(pool.id);
          } catch { /* ignore */ }
          return { pool, memberCount };
        }),
      );
      setPools(enriched);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  useEffect(() => {
    refresh();
  }, [wallet]);

  async function handleCreate() {
    if (!name.trim() || !wallet) return;
    setBusy(true);
    setError("");
    try {
      const p = await createPool(name.trim(), wallet);
      navigate(`/pools/${p.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  async function handleJoin() {
    if (!code.trim() || !wallet) return;
    setBusy(true);
    setError("");
    try {
      const p = await joinPool(code.trim(), wallet);
      navigate(`/pools/${p.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageTransition className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-8 pb-24">
      <h1 className="text-2xl font-black">Pools</h1>

      {error && (
        <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* Create */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mt-5 glass rounded-3xl p-5 shadow-card"
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-grass/15 text-grass">
            <Plus className="h-5 w-5" />
          </div>
          <span className="font-bold">Create a pool</span>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Office World Cup"
          className="field"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />
        <button
          onClick={handleCreate}
          disabled={busy || !name.trim()}
          className="btn-primary mt-3 w-full"
        >
          {busy ? "Creating…" : "Create & get my teams"}
        </button>
      </motion.div>

      {/* Join */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="mt-4 glass rounded-3xl p-5 shadow-card"
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gold/15 text-gold">
            <LogIn className="h-5 w-5" />
          </div>
          <span className="font-bold">Join with a code</span>
        </div>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC23"
            className="field flex-1 font-mono uppercase tracking-[0.3em]"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleJoin();
            }}
          />
          <button onClick={handleJoin} disabled={busy || !code.trim()} className="btn-ghost px-5">
            Join
          </button>
        </div>
      </motion.div>

      {/* My pools */}
      <div className="mt-8">
        <Label>My pools</Label>
        <div className="mt-3 space-y-2">
          {pools.length === 0 && (
            <EmptyState
              icon={Trophy}
              title="No pools yet"
              description="Create one or join with a code from a friend."
            />
          )}
          {pools.map(({ pool, memberCount }, i) => (
            <motion.button
              key={pool.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/pools/${pool.id}`)}
              className="group flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-grass/50 hover:bg-white/[0.07]"
            >
              <div>
                <div className="font-bold">{pool.name}</div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-white/40">
                  <span className="font-mono text-gold">#{pool.join_code}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {memberCount}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-white/30 transition group-hover:translate-x-1 group-hover:text-grass" />
            </motion.button>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
