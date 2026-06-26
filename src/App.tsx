import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Pools from "./pages/Pools";
import PoolDetail from "./pages/PoolDetail";
import Setup from "./pages/Setup";

function Landing({ onSetup }: { onSetup: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center px-6 py-10 text-center">
      <span className="mb-6 rounded-full border border-white/20 bg-white/5 px-4 py-1 text-xs font-medium uppercase tracking-widest text-gold">
        World Cup 2026
      </span>
      <div className="mb-4 text-6xl">⚽</div>
      <h1 className="bg-gradient-to-r from-grass to-gold bg-clip-text text-5xl font-black leading-tight text-transparent">
        GolPool
      </h1>
      <p className="mt-4 text-lg text-white/80">
        The group sweepstake that scores itself. Get teams, watch the leaderboard
        update <span className="font-semibold text-gold">live</span> as goals happen.
      </p>

      <div className="mt-8 w-full">
        <WalletMultiButton />
      </div>

      <div className="mt-12 grid w-full grid-cols-3 gap-3 text-center">
        {[
          { k: "104", v: "Matches" },
          { k: "Live", v: "Scoring" },
          { k: "Solana", v: "Sign-in" },
        ].map((s) => (
          <div key={s.v} className="rounded-xl border border-white/10 bg-white/5 px-2 py-4">
            <div className="text-xl font-bold text-gold">{s.k}</div>
            <div className="text-xs uppercase tracking-wide text-white/60">{s.v}</div>
          </div>
        ))}
      </div>

      <button onClick={onSetup} className="mt-auto pt-10 text-xs text-white/40 hover:underline">
        ⚙️ Setup TxLINE data feed
      </button>
    </main>
  );
}

function App() {
  const { connected } = useWallet();
  const [view, setView] = useState<"pools" | "pool" | "setup">("pools");
  const [poolId, setPoolId] = useState<string | null>(null);

  if (view === "setup") return <Setup onBack={() => setView("pools")} />;
  if (!connected) return <Landing onSetup={() => setView("setup")} />;
  if (view === "pool" && poolId)
    return <PoolDetail poolId={poolId} onBack={() => setView("pools")} />;
  return (
    <Pools
      onOpenPool={(id) => {
        setPoolId(id);
        setView("pool");
      }}
      onSetup={() => setView("setup")}
    />
  );
}

export default App;
