import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  subscribeAndActivate,
  activateOnly,
  type SubscribeResult,
} from "../lib/subscribe";
import { ACTIVE_NETWORK } from "../solana/WalletContext";
import { SELECTED_LEAGUES } from "../lib/txlineConfig";

// A fresh un-used subscription tx (finalized on-chain). 44eNd… and 2W1JaCs3… were
// already consumed. Remaining backup: 25X2ocPn…
const KNOWN_TX_SIG =
  "4RzQZcWpqjLwoFkNNQu6uKAfka7di6paKN6MUJi7LGohagXm5ywjgaiHZrLN9evSY8Sg4TXpTgbjjVry7UfmSSnd";

export default function Setup({ onBack }: { onBack?: () => void }) {
  const { publicKey, sendTransaction, signMessage, connected } = useWallet();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubscribeResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [txSig, setTxSig] = useState(KNOWN_TX_SIG);
  const [manualOut, setManualOut] = useState("");

  // Plan B: produce {txSig, jwt, walletSignature} locally. Only guest/start hits
  // the (flaky) proxy and it's non-destructive — the tx-consuming activate call
  // is done server-side by Claude, which reliably captures the token.
  async function prepareManual() {
    if (!publicKey || !signMessage || !txSig.trim()) return;
    setBusy(true);
    setError("");
    setManualOut("");
    try {
      setStatus("Getting guest token…");
      const res = await fetch("/txapi/auth/guest/start", { method: "POST" });
      if (!res.ok) throw new Error(`guest/start ${res.status}`);
      const jwt = (await res.json()).token as string;
      const message = `${txSig.trim()}:${SELECTED_LEAGUES.join(",")}:${jwt}`;
      setStatus("Sign the message in Phantom (free, local)…");
      const sig = await signMessage(new TextEncoder().encode(message));
      const walletSignature = btoa(String.fromCharCode(...sig));
      setManualOut(
        JSON.stringify({ txSig: txSig.trim(), jwt, walletSignature }, null, 2),
      );
      setStatus("✅ Signature ready — copy the box below and send it to Claude.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runActivate() {
    if (!publicKey || !signMessage || !txSig.trim()) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const r = await activateOnly({ publicKey, signMessage }, txSig.trim(), setStatus);
      setResult(r);
      setStatus("✅ API token activated!");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function runSubscribe() {
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
        Subscribe to the free real-time World Cup tier with your Solana wallet.
        Your key never leaves Phantom.
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
            <div className="break-all font-mono text-xs">{publicKey.toBase58()}</div>
          </div>

          {!result && (
            <>
              {/* Tx signature input (shared by both flows). */}
              <div className="space-y-1 rounded-xl border border-white/10 bg-white/5 p-4">
                <label className="block text-xs text-white/60">
                  Subscription transaction signature
                </label>
                <input
                  value={txSig}
                  onChange={(e) => setTxSig(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-black/30 p-2 font-mono text-[10px]"
                />
              </div>

              {/* Plan B (reliable): sign locally, Claude activates server-side. */}
              <div className="space-y-2 rounded-xl border border-grass/40 bg-grass/5 p-4">
                <div className="text-sm font-semibold text-grass">
                  ✅ Generate activation signature (recommended)
                </div>
                <p className="text-xs text-white/60">
                  Signs locally in Phantom (free, no SOL). Copy the result and
                  send it to Claude to finish activation.
                </p>
                <button
                  onClick={prepareManual}
                  disabled={busy}
                  className="w-full rounded-xl bg-grass px-6 py-3 font-bold text-ink transition active:scale-95 disabled:opacity-50"
                >
                  {busy ? "Working…" : "Generate signature"}
                </button>
                {manualOut && (
                  <>
                    <pre className="max-h-40 overflow-auto rounded-lg bg-black/40 p-3 text-[10px]">
                      {manualOut}
                    </pre>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(manualOut);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      className="w-full rounded-lg border border-white/20 bg-white/5 py-2 text-sm font-semibold"
                    >
                      {copied ? "Copied ✓" : "Copy & send to Claude"}
                    </button>
                  </>
                )}
              </div>

              {/* Alternative: direct browser activation (may hit flaky proxy). */}
              <details className="rounded-xl border border-white/10 bg-white/5 p-4">
                <summary className="cursor-pointer text-sm text-white/70">
                  Other options
                </summary>
                <button
                  onClick={runActivate}
                  disabled={busy}
                  className="mt-3 w-full rounded-xl border border-white/20 bg-white/5 px-6 py-3 font-semibold transition active:scale-95 disabled:opacity-50"
                >
                  {busy ? "Working…" : "Activate directly (browser)"}
                </button>
                <button
                  onClick={runSubscribe}
                  disabled={busy}
                  className="mt-2 w-full rounded-xl border border-white/20 bg-white/5 px-6 py-3 font-semibold transition active:scale-95 disabled:opacity-50"
                >
                  {busy ? "Working…" : "Subscribe again (~$0.02)"}
                </button>
              </details>
            </>
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
                Paste this into{" "}
                <code className="text-gold">golpool/.env.local</code>:
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
            </div>
          )}
        </div>
      )}
    </main>
  );
}
