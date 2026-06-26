import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { createPool, joinPool, getMyPools, type Pool } from "../lib/api";

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
      setName("");
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
      setCode("");
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
        <h1 className="bg-gradient-to-r from-grass to-gold bg-clip-text text-3xl font-black text-transparent">
          GolPool
        </h1>
        <WalletMultiButton />
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* Create */}
      <div className="mt-6 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-semibold">Create a pool</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Pool name (e.g. Office World Cup)"
          className="w-full rounded-lg border border-white/15 bg-black/30 p-3 text-sm"
        />
        <button
          onClick={handleCreate}
          disabled={busy || !name.trim()}
          className="w-full rounded-xl bg-grass px-6 py-3 font-bold text-ink transition active:scale-95 disabled:opacity-50"
        >
          {busy ? "…" : "Create pool"}
        </button>
      </div>

      {/* Join */}
      <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-semibold">Join with a code</div>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC23"
            className="w-full rounded-lg border border-white/15 bg-black/30 p-3 font-mono text-sm uppercase tracking-widest"
          />
          <button
            onClick={handleJoin}
            disabled={busy || !code.trim()}
            className="rounded-xl border border-white/20 bg-white/10 px-5 font-semibold transition active:scale-95 disabled:opacity-50"
          >
            Join
          </button>
        </div>
      </div>

      {/* My pools */}
      <div className="mt-6">
        <div className="mb-2 text-xs uppercase tracking-widest text-white/40">My pools</div>
        {pools.length === 0 && (
          <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/50">
            No pools yet — create one or join with a code.
          </p>
        )}
        <div className="space-y-2">
          {pools.map((p) => (
            <button
              key={p.id}
              onClick={() => onOpenPool(p.id)}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-grass/50"
            >
              <span className="font-semibold">{p.name}</span>
              <span className="font-mono text-xs text-gold">{p.join_code}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onSetup}
        className="mt-auto pt-8 text-xs text-white/30 hover:text-white/60"
      >
        ⚙️ TxLINE setup
      </button>
    </main>
  );
}
