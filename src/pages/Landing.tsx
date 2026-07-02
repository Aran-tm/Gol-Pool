import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { motion, type Variants } from "framer-motion";
import { Trophy, Radio, Wallet } from "lucide-react";
import AnimatedBall from "../components/AnimatedBall";
import { useWalletError } from "../solana/WalletContext";
import { getProfiles } from "../lib/api";

// Mobile browsers have no injected wallet provider (that only exists in a desktop
// extension or Phantom's own in-app browser) — offer a deep link into Phantom instead
// of a "Connect" button that would silently find nothing.
const IS_MOBILE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

export default function Landing() {
  const { connected, connecting, disconnect, select, publicKey, wallets } = useWallet();
  const navigate = useNavigate();
  const { message, clear } = useWalletError();
  const [stuck, setStuck] = useState(false);

  const noWalletDetected = wallets.every((w) => w.readyState !== WalletReadyState.Installed);
  const phantomDeepLink = `https://phantom.app/ul/browse/${encodeURIComponent(window.location.href)}?ref=${encodeURIComponent(window.location.origin)}`;

  // Auto-navigate when wallet connects. The local flag is just a fast-path cache —
  // it lives per device, so a wallet that already has a name (set on another device)
  // must still be checked against its actual profile before assuming onboarding is needed.
  useEffect(() => {
    if (!connected || !publicKey) return;
    if (localStorage.getItem("golpool_onboarded")) {
      navigate("/dashboard", { replace: true });
      return;
    }
    let cancelled = false;
    getProfiles([publicKey.toBase58()])
      .then((profiles) => {
        if (cancelled) return;
        const hasName = !!profiles.get(publicKey.toBase58())?.display_name;
        if (hasName) localStorage.setItem("golpool_onboarded", "true");
        navigate(hasName ? "/dashboard" : "/onboarding", { replace: true });
      })
      .catch(() => {
        if (!cancelled) navigate("/onboarding", { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [connected, publicKey, navigate]);

  // Phantom's approval popup can be missed, blocked, or ignored — if
  // "Connecting…" drags on, offer a way out instead of a dead button
  // (the wallet-adapter button has no click handler while connecting).
  useEffect(() => {
    if (!connecting) {
      setStuck(false);
      return;
    }
    const t = setTimeout(() => setStuck(true), 8000);
    return () => clearTimeout(t);
  }, [connecting]);

  async function resetConnection() {
    try {
      await disconnect();
      select(null);
    } catch { /* ignore */ }
    localStorage.removeItem("walletName");
    setStuck(false);
    clear();
  }

  const stats = [
    { icon: Trophy, k: "104", v: "Matches" },
    { icon: Radio, k: "Live", v: "Scoring" },
    { icon: Wallet, k: "Solana", v: "Sign-in" },
  ];

  return (
    <motion.main
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center px-6 py-12 text-center"
    >
      <motion.span
        variants={item}
        className="mb-8 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-gold backdrop-blur"
      >
        World Cup 2026
      </motion.span>

      {/* Animated ball */}
      <motion.div variants={item} className="mb-2">
        <AnimatedBall size={132} />
      </motion.div>

      <motion.h1
        variants={item}
        className="text-gradient text-6xl font-black leading-none tracking-tight"
      >
        GolPool
      </motion.h1>

      <motion.p
        variants={item}
        className="mt-5 max-w-xs text-lg leading-relaxed text-white/70"
      >
        The group sweepstake that{" "}
        <span className="font-semibold text-white">scores itself.</span> Watch
        the leaderboard move{" "}
        <span className="font-semibold text-gold">live</span> with every goal.
      </motion.p>

      <motion.div variants={item} className="mt-9 w-full">
        {IS_MOBILE && noWalletDetected ? (
          <>
            <a
              href={phantomDeepLink}
              className="btn-primary flex w-full items-center justify-center"
            >
              Open in Phantom
            </a>
            <p className="mt-3 text-xs text-white/40">
              Your mobile browser can't see your wallet — this opens the app inside Phantom
            </p>
          </>
        ) : (
          <>
            <WalletMultiButton style={{ width: "100%", justifyContent: "center" }} />
            <p className="mt-3 text-xs text-white/40">
              Connect your wallet to enter — free, no fees
            </p>
          </>
        )}
        {message && (
          <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/[0.06] p-3 text-xs text-red-300">
            {message}
          </p>
        )}
        {stuck && (
          <button
            onClick={resetConnection}
            className="mt-2 text-xs text-white/40 underline transition hover:text-white/70"
          >
            Taking too long? Tap to reset and try again
          </button>
        )}
      </motion.div>

      <motion.div
        variants={item}
        className="mt-12 grid w-full grid-cols-3 gap-3"
      >
        {stats.map((s) => (
          <div key={s.v} className="glass rounded-2xl px-2 py-4">
            <s.icon className="mx-auto mb-1.5 h-4 w-4 text-grass" />
            <div className="text-lg font-bold text-gold">{s.k}</div>
            <div className="text-[10px] uppercase tracking-wide text-white/50">
              {s.v}
            </div>
          </div>
        ))}
      </motion.div>

      {/* How it works teaser */}
      <motion.div
        variants={item}
        className="mt-10 w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left"
      >
        <h3 className="text-sm font-bold text-white/80">How it works</h3>
        <ol className="mt-2 space-y-2 text-xs text-white/50">
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-grass/20 text-[10px] font-bold text-grass">
              1
            </span>
            Connect your wallet — it's your identity, not your bank
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/20 text-[10px] font-bold text-gold">
              2
            </span>
            Create a pool or join one — you get 4 random World Cup teams
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-grass/20 text-[10px] font-bold text-grass">
              3
            </span>
            Watch the leaderboard update live as goals are scored
          </li>
        </ol>
      </motion.div>

      <p className="mt-auto pt-10 text-center text-[11px] text-white/25">
        Powered by TxLINE real-time data · Built on Solana
      </p>
    </motion.main>
  );
}
