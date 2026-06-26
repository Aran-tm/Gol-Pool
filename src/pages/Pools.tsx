import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { Plus, LogIn, ChevronRight, Settings, Trophy } from "lucide-react";
import { createPool, joinPool, getMyPools, type Pool } from "../lib/api";
import { Label } from "../components/ui";

export default function Pools({
  onOpenPool,
  onSetup,
}: {
  onOpenPool: (poolId: string) => void;
  onSetup: () => void;
}) {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? "";
  const [pools, setPools] = useState<Pool[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    if (!wallet) return;
    try {
      setPools(await getMyPools(wallet));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  async function handleCreate() {
    if (!name.trim() || !wallet) return;
    setBusy(true);
    setError("");
    try {
      const p = await createPool(name.trim(), wallet);
      onOpenPool(p.id);
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
      onOpenPool(p.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <span className="text-gradient text-2xl font-black tracking-tight">GolPool</span>
        </div>
        <WalletMultiButton />
      </div>

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
        className="mt-6 glass rounded-3xl p-5 shadow-card"
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
            <div className="glass flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
              <Trophy className="h-7 w-7 text-white/30" />
              <p className="text-sm text-white/50">No pools yet — create one or join with a code.</p>
            </div>
          )}
          {pools.map((p, i) => (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onOpenPool(p.id)}
              className="group flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-grass/50 hover:bg-white/[0.07]"
            >
              <div>
                <div className="font-bold">{p.name}</div>
                <div className="font-mono text-xs text-gold">#{p.join_code}</div>
              </div>
              <ChevronRight className="h-5 w-5 text-white/30 transition group-hover:translate-x-1 group-hover:text-grass" />
            </motion.button>
          ))}
        </div>
      </div>

      <button
        onClick={onSetup}
        className="mt-auto flex items-center gap-1.5 pt-8 text-xs text-white/30 transition hover:text-white/60"
      >
        <Settings className="h-3.5 w-3.5" /> TxLINE setup
      </button>
    </main>
  );
}
