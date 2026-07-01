import { useEffect } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import AnimatedTrophy from "./AnimatedTrophy";
import Avatar from "./Avatar";

interface Props {
  name: string;
  wallet: string;
  avatarUrl?: string;
  points: number;
  poolName: string;
  onDone: () => void;
}

/** Full-screen champion celebration shown once when a pool finishes. */
export default function ChampionCelebration({ name, wallet, avatarUrl, points, poolName, onDone }: Props) {
  useEffect(() => {
    const fire = (x: number) =>
      confetti({
        particleCount: 90,
        spread: 100,
        startVelocity: 55,
        origin: { x, y: 0.45 },
        colors: ["#ffd166", "#22c55e", "#ffffff", "#0b6e4f"],
      });
    fire(0.3);
    fire(0.7);
    const id = setTimeout(() => fire(0.5), 500);
    return () => clearTimeout(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDone}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-ink-950/95 px-6 text-center backdrop-blur-xl"
    >
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold"
      >
        {poolName} · Champion
      </motion.p>

      <AnimatedTrophy size={160} className="my-4" />

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.2 }}
        className="flex flex-col items-center gap-3"
      >
        <Avatar wallet={wallet} name={name} src={avatarUrl} size={72} />
        <h2 className="text-gradient text-4xl font-black">{name}</h2>
        <div className="rounded-full border border-gold/40 bg-gold/[0.08] px-5 py-1.5 text-lg font-black text-gold">
          {points} pts
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        onClick={onDone}
        className="btn-primary mt-10 px-10"
      >
        🎉 Nice one
      </motion.button>
      <p className="mt-3 text-xs text-white/30">Tap anywhere to close</p>
    </motion.div>
  );
}
