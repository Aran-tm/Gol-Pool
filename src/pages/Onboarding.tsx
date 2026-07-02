import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { UserPlus, Trophy, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { updateDisplayName } from "../lib/api";
import Avatar from "../components/Avatar";

const SLIDES = [
  {
    emoji: "⚽",
    title: "Welcome to GolPool",
    body: "The World Cup sweepstake that scores itself. Create a pool with friends, get teams assigned randomly, and watch the leaderboard move live with every goal.",
    steps: null,
  },
  {
    emoji: null,
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
    title: "You're all set",
    body: "104 World Cup matches. Live leaderboards. Your friends. No spreadsheets, no manual entry — just watch the goals roll in.",
    steps: null,
  },
];

export default function Onboarding() {
  const [[step, dir], setStep] = useState<[number, number]>([0, 0]);
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const { publicKey, signMessage } = useWallet();
  const wallet = publicKey?.toBase58() ?? "";

  async function finish() {
    const trimmed = name.trim();
    if (trimmed && wallet) {
      try {
        await updateDisplayName(wallet, signMessage, trimmed);
      } catch { /* ignore */ }
    }
    localStorage.setItem("golpool_onboarded", "true");
    navigate("/dashboard", { replace: true });
  }

  function go(to: number) {
    if (to < 0 || to >= SLIDES.length) return;
    setStep(([cur]) => [to, to > cur ? 1 : -1]);
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    const threshold = 50;
    if (info.offset.x < -threshold) go(step + 1);
    else if (info.offset.x > threshold) go(step - 1);
  }

  const s = SLIDES[step];
  const isFirst = step === 0;
  const isLast = step === SLIDES.length - 1;

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 48 : -48 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d > 0 ? -48 : 48 }),
  };

  return (
    <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-6 pt-8 pb-16 sm:pb-24">
      {/* Desktop side arrows — flanking the carousel, a bit outside the content column */}
      <button
        onClick={() => go(step - 1)}
        disabled={isFirst}
        aria-label="Previous"
        className="absolute -left-5 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70 backdrop-blur transition hover:border-grass/50 hover:text-grass disabled:pointer-events-none disabled:opacity-25 sm:grid lg:-left-14"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={() => go(step + 1)}
        disabled={isLast}
        aria-label="Next"
        className="absolute -right-5 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70 backdrop-blur transition hover:border-grass/50 hover:text-grass disabled:pointer-events-none disabled:opacity-25 sm:grid lg:-right-14"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Skip */}
      <button
        onClick={finish}
        className="z-10 self-end text-xs text-white/40 transition hover:text-white/70"
      >
        Skip
      </button>

      {/* Slide area */}
      <div className="flex flex-1 items-center justify-center">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: "easeOut" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.16}
            onDragEnd={onDragEnd}
            className="flex w-full cursor-grab flex-col items-center text-center active:cursor-grabbing"
          >
            {/* Emoji */}
            {s.emoji && (
              <div className="relative mb-6 h-24 w-24 sm:h-28 sm:w-28">
                <div className="absolute inset-0 rounded-full bg-grass/25 blur-3xl" />
                <div className="relative flex h-full w-full items-center justify-center">
                  <motion.span
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="text-6xl drop-shadow-[0_6px_20px_rgba(34,197,94,0.4)] sm:text-7xl"
                  >
                    {s.emoji}
                  </motion.span>
                </div>
              </div>
            )}

            {/* Title */}
            <h2 className="text-2xl font-black text-white sm:text-3xl">{s.title}</h2>

            {/* Body */}
            {s.body && (
              <p className="mx-auto mt-4 max-w-[18rem] text-sm leading-relaxed text-white/60 sm:max-w-sm sm:text-base">
                {s.body}
              </p>
            )}

            {/* Name + avatar preview (last slide) */}
            {isLast && (
              <div className="mt-7 flex w-full max-w-xs flex-col items-center gap-3">
                <Avatar wallet={wallet} name={name} size={64} />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name (optional)"
                  maxLength={40}
                  className="field w-full text-center"
                />
              </div>
            )}

            {/* Steps list (slide 2) */}
            {s.steps && (
              <div className="mt-7 flex w-full max-w-sm flex-col gap-3">
                {s.steps.map((st, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 text-left sm:gap-4 sm:p-4"
                  >
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] sm:h-10 sm:w-10 ${st.color}`}>
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
      <div className="mt-6 flex flex-col items-center gap-5">
        {/* Dots */}
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === step ? "w-6 bg-grass" : "w-2 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>

        {/* Nav buttons */}
        <div className="flex w-full items-center justify-between">
          <button
            onClick={() => go(step - 1)}
            disabled={isFirst}
            className="flex items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white/60 transition hover:text-white disabled:opacity-0"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          {isLast ? (
            <button onClick={finish} className="btn-primary px-10">
              Let's go!
            </button>
          ) : (
            <button
              onClick={() => go(step + 1)}
              className="flex items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:text-white"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Swipe hint (mobile) */}
        <p className="text-[11px] text-white/25 sm:hidden">Swipe to navigate</p>
      </div>
    </main>
  );
}
