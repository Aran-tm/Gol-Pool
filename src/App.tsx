import { useState } from "react";
import Setup from "./pages/Setup";

function App() {
  const [view, setView] = useState<"home" | "setup">("home");

  if (view === "setup") return <Setup onBack={() => setView("home")} />;

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
        update <span className="font-semibold text-gold">live</span> as goals
        happen.
      </p>

      <div className="mt-8 flex w-full flex-col gap-3">
        <button
          type="button"
          className="w-full rounded-xl bg-grass px-6 py-4 text-lg font-bold text-ink shadow-lg transition active:scale-95"
        >
          Connect Wallet to Start
        </button>
        <button
          type="button"
          className="w-full rounded-xl border border-white/20 bg-white/5 px-6 py-4 text-lg font-semibold text-white transition active:scale-95"
        >
          Join a Pool
        </button>
      </div>

      <div className="mt-12 grid w-full grid-cols-3 gap-3 text-center">
        {[
          { k: "104", v: "Matches" },
          { k: "Live", v: "Scoring" },
          { k: "Solana", v: "Sign-in" },
        ].map((s) => (
          <div
            key={s.v}
            className="rounded-xl border border-white/10 bg-white/5 px-2 py-4"
          >
            <div className="text-xl font-bold text-gold">{s.k}</div>
            <div className="text-xs uppercase tracking-wide text-white/60">
              {s.v}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setView("setup")}
        className="mt-auto pt-10 text-xs text-white/40 underline-offset-2 hover:underline"
      >
        ⚙️ Setup TxLINE data feed
      </button>
    </main>
  );
}

export default App;
