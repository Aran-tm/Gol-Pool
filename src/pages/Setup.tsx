import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { subscribeAndActivate, type SubscribeResult } from "../lib/subscribe";
import { ACTIVE_NETWORK } from "../solana/WalletContext";

export default function Setup({ onBack }: { onBack?: () => void }) {
  const { publicKey, sendTransaction, signMessage, connected } = useWallet();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubscribeResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function run() {
    if (!publicKey || !signMessage) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const r = await subscribeAndActivate(
        { publicKey, sendTransaction, signMessage },
        ACTIVE_NETWORK,
        setStatus,
      );
      setResult(r);
      setStatus("✅ Subscription active!");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const envLine = result
    ? `TXLINE_NETWORK=${ACTIVE_NETWORK}\nTXLINE_API_TOKEN=${result.apiToken}`
    : "";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-8">
      <button
        onClick={onBack}
        className="mb-6 self-start text-sm text-white/60 hover:text-white"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold">Connect TxLINE data feed</h1>
      <p className="mt-2 text-sm text-white/70">
        One-time setup. Subscribe to the free real-time World Cup tier with your
        Solana wallet. Your key never leaves Phantom.
      </p>

      <div className="mt-6">
        <WalletMultiButton />
      </div>

      {connected && publicKey && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
            <div className="text-white/50">Network</div>
            <div className="font-semibold capitalize">{ACTIVE_NETWORK}</div>
            <div className="mt-2 text-white/50">Wallet</div>
            <div className="break-all font-mono text-xs">
              {publicKey.toBase58()}
            </div>
          </div>

          {!result && (
            <button
              onClick={run}
              disabled={busy}
              className="w-full rounded-xl bg-grass px-6 py-4 text-lg font-bold text-ink shadow-lg transition active:scale-95 disabled:opacity-50"
            >
              {busy ? "Working…" : "Subscribe to TxLINE (free)"}
            </button>
          )}

          {status && <p className="text-center text-sm text-gold">{status}</p>}
          {error && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}

          {result && (
            <div className="space-y-3 rounded-xl border border-grass/40 bg-grass/10 p-4">
              <div className="text-sm font-semibold text-grass">
                🎉 API token activated
              </div>
              <p className="text-xs text-white/70">
                Paste this into <code className="text-gold">golpool/.env.local</code>{" "}
                (and the worker reads it):
              </p>
              <pre className="overflow-x-auto rounded-lg bg-black/40 p-3 text-xs">
                {envLine}
              </pre>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(envLine);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="w-full rounded-lg border border-white/20 bg-white/5 py-2 text-sm font-semibold"
              >
                {copied ? "Copied ✓" : "Copy to clipboard"}
              </button>
              <p className="break-all text-[10px] text-white/40">
                tx: {result.txSig}
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
