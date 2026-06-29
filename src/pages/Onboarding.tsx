import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Trophy, Zap, ChevronLeft, ChevronRight } from "lucide-react";

const SLIDES = [
  {
    emoji: "⚽",
    icon: null,
    title: "Welcome to GolPool",
    body: "The World Cup sweepstake that scores itself. Create a pool with friends, get teams assigned randomly, and watch the leaderboard move live with every goal.",
  },
  {
    emoji: null,
    icon: null,
    title: "How it works",
    body: null,
    steps: [
      { icon: UserPlus, text: "Connect your Phantom wallet — free, your identity only", color: "text-grass" },
      { icon: Trophy, text: "Create a pool or join one with a short code", color: "text-gold" },
      { icon: Zap, text: "Real-time scoring from TxLINE — goals, wins, clean sheets", color: "text-grass" },
    ],
  },
  {
    emoji: "🏆",
    icon: null,
    title: "You're all set",
    body: "104 World Cup matches. Live leaderboards. Your friends. No spreadsheets, no manual entry — just watch the goals roll in.",
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  function finish() {
    localStorage.setItem("golpool_onboarded", "true");
    navigate("/dashboard", { replace: true });
  }

  function skip() {
    localStorage.setItem("golpool_onboarded", "true");
    navigate("/dashboard", { replace: true });
  }

  const s = SLIDES[step];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-10">
      {/* Skip */}
      <button
        onClick={skip}
        className="self-end text-xs text-white/40 transition hover:text-white/70"
      >
        Skip
      </button>

      {/* Slide content */}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center"
          >
            {/* Emoji */}
            {s.emoji && (
              <div className="relative mb-6 h-28 w-28">
                <div className="absolute inset-0 rounded-full bg-grass/25 blur-3xl" />
                <div className="relative flex h-full w-full items-center justify-center">
                  <span className="text-7xl drop-shadow-[0_6px_20px_rgba(34,197,94,0.4)]">
                    {s.emoji}
                  </span>
                </div>
              </div>
            )}

            {/* Title */}
            <h2 className="text-3xl font-black text-white">{s.title}</h2>

            {/* Body */}
            {s.body && (
              <p className="mt-4 max-w-xs text-base leading-relaxed text-white/60">
                {s.body}
              </p>
            )}

            {/* Steps list (slide 2) */}
            {s.steps && (
              <div className="mt-8 flex w-full flex-col gap-4">
                {s.steps.map((st, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left"
                  >
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] ${st.color}`}>
                      <st.icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm text-white/70">{st.text}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer: dots + buttons */}
      <div className="mt-8 flex flex-col items-center gap-6">
        {/* Dots */}
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all ${
                i === step ? "w-6 bg-grass" : "w-2 bg-white/20"
              }`}
            />
          ))}
        </div>

        {/* Nav buttons */}
        <div className="flex w-full items-center justify-between">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="flex items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white/60 transition hover:text-white disabled:opacity-0"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          {step === SLIDES.length - 1 ? (
            <button onClick={finish} className="btn-primary px-10">
              Let's go!
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:text-white"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
