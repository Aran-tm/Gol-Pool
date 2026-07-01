import { useEffect } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import Flag from "./Flag";
import AnimatedBall from "./AnimatedBall";

interface Props {
  teams: { id: number; name: string }[];
  onDone: () => void;
}

/** Full-screen "here are your teams" reveal — the emotional moment of the sweepstake. */
export default function TeamReveal({ teams, onDone }: Props) {
  useEffect(() => {
    confetti({
      particleCount: 160,
      spread: 90,
      startVelocity: 50,
      origin: { y: 0.4 },
      colors: ["#22c55e", "#ffd166", "#ffffff", "#0b6e4f"],
    });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDone}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-ink-950/95 px-6 backdrop-blur-xl"
    >
      <AnimatedBall size={96} className="mb-4" />
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold"
      >
        Your teams
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
        className="text-gradient mt-2 text-4xl font-black"
      >
        You're in!
      </motion.h2>

      <div className="mt-9 grid w-full max-w-xs grid-cols-2 gap-3">
        {teams.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 24, rotate: -6 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ delay: 0.25 + i * 0.18, type: "spring", stiffness: 260, damping: 18 }}
            className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-card"
          >
            <Flag name={t.name} className="text-4xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]" />
            <span className="text-center text-sm font-bold">{t.name}</span>
          </motion.div>
        ))}
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 + teams.length * 0.18 + 0.3 }}
        onClick={onDone}
        className="btn-primary mt-10 px-10"
      >
        Let's play
      </motion.button>
      <p className="mt-3 text-xs text-white/30">Good luck — the leaderboard is live</p>
    </motion.div>
  );
}
