import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { ArrowLeft, Copy, Check, Zap } from "lucide-react";
import { subscribeOnly, activateOnly, type SubscribeResult } from "../lib/subscribe";
import { ACTIVE_NETWORK } from "../solana/WalletContext";
import { needsPhantomDeepLink, phantomDeepLink } from "../solana/mobile";
import { SELECTED_LEAGUES } from "../lib/txlineConfig";

const KNOWN_TX_SIG = "";

export default function Setup() {
  const navigate = useNavigate();
  const { publicKey, sendTransaction, signMessage, connected } = useWallet();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubscribeResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [txSig, setTxSig] = useState(KNOWN_TX_SIG);
  const [manualOut, setManualOut] = useState("");

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
      setManualOut(JSON.stringify({ txSig: txSig.trim(), jwt, walletSignature }, null, 2));
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
    setManualOut("");
    try {
      setStatus("Approve the subscription in Phantom…");
      const newSig = await subscribeOnly({ publicKey, sendTransaction, signMessage }, ACTIVE_NETWORK, setStatus);
      setTxSig(newSig);
      setStatus("✅ New subscription tx created. Now generate the signature.");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const envLine = result ? `TXLINE_NETWORK=${ACTIVE_NETWORK}\nTXLINE_API_TOKEN=${result.apiToken}` : "";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-8">
      <button onClick={() => navigate(-1)} className="mb-5 flex w-fit items-center gap-1 text-sm text-white/60 transition hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-grass/15 text-grass">
          <Zap className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-black">TxLINE data feed</h1>
      </div>
      <p className="mt-2 text-sm text-white/60">
        One-time setup. Subscribe to the free real-time World Cup tier with your wallet — your key never leaves Phantom.
      </p>

      <div className="mt-6">
        {needsPhantomDeepLink() ? (
          <>
            <a
              href={phantomDeepLink()}
              className="btn-primary flex w-full items-center justify-center"
            >
              Open in Phantom
            </a>
            <p className="mt-3 text-xs text-white/40">
              Your mobile browser can't see your wallet — this opens the app inside Phantom
            </p>
          </>
        ) : (
          <WalletMultiButton style={{ width: "100%", justifyContent: "center" }} />
        )}
      </div>

      {connected && publicKey && (
        <div className="mt-6 space-y-4">
          <div className="glass rounded-2xl p-4 text-sm">
            <div className="text-white/40">Network</div>
            <div className="font-semibold capitalize">{ACTIVE_NETWORK}</div>
            <div className="mt-2 text-white/40">Wallet</div>
            <div className="break-all font-mono text-xs">{publicKey.toBase58()}</div>
          </div>

          {!result && (
            <>
              <div className="glass rounded-2xl p-4">
                <div className="text-sm font-semibold">Step 1 — Get a subscription tx</div>
                <p className="mt-1 text-xs text-white/50">Fresh on-chain subscription (~$0.02). Fills the field below.</p>
                <button onClick={runSubscribe} disabled={busy} className="btn-ghost mt-3 w-full">
                  {busy ? "Working…" : "Subscribe (new tx)"}
                </button>
              </div>

              <div className="rounded-2xl border border-grass/40 bg-grass/[0.06] p-4">
                <div className="text-sm font-semibold text-grass">Step 2 — Generate signature</div>
                <input
                  value={txSig}
                  onChange={(e) => setTxSig(e.target.value)}
                  placeholder="subscription tx signature"
                  className="field mt-2 font-mono text-[10px]"
                />
                <button onClick={prepareManual} disabled={busy || !txSig.trim()} className="btn-primary mt-3 w-full">
                  {busy ? "Working…" : "Generate signature"}
                </button>
                {manualOut && (
                  <>
                    <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-black/50 p-3 text-[10px]">{manualOut}</pre>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(manualOut);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      className="btn-ghost mt-2 flex w-full items-center justify-center gap-1.5 py-2 text-sm"
                    >
                      {copied ? <Check className="h-4 w-4 text-grass" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copied" : "Copy & send to Claude"}
                    </button>
                  </>
                )}
              </div>

              <details className="glass rounded-2xl p-4">
                <summary className="cursor-pointer text-sm text-white/60">Advanced: activate directly in browser</summary>
                <button onClick={runActivate} disabled={busy || !txSig.trim()} className="btn-ghost mt-3 w-full">
                  {busy ? "Working…" : "Activate directly (browser)"}
                </button>
              </details>
            </>
          )}

          {status && <p className="text-center text-sm text-gold">{status}</p>}
          {error && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>
          )}

          {result && (
            <div className="space-y-3 rounded-2xl border border-grass/40 bg-grass/[0.08] p-4">
              <div className="text-sm font-semibold text-grass">🎉 API token activated</div>
              <p className="text-xs text-white/60">
                Paste into <code className="text-gold">golpool/.env.local</code>:
              </p>
              <pre className="overflow-x-auto rounded-lg bg-black/50 p-3 text-xs">{envLine}</pre>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(envLine);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="btn-ghost flex w-full items-center justify-center gap-1.5 py-2 text-sm"
              >
                {copied ? <Check className="h-4 w-4 text-grass" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
