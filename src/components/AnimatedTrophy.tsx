import { motion } from "framer-motion";

/** Pro animated gold trophy — SVG + framer-motion (float + shine sweep + sparkles). */
export default function AnimatedTrophy({ size = 140, className }: { size?: number; className?: string }) {
  return (
    <div className={`relative ${className ?? ""}`} style={{ width: size, height: size }}>
      <motion.div
        className="absolute inset-0 rounded-full bg-gold/30 blur-3xl"
        animate={{ opacity: [0.5, 0.9, 0.5], scale: [0.9, 1.1, 0.9] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        animate={{ y: [0, -8, 0], rotate: [-2, 2, -2] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="relative h-full w-full"
      >
        <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-[0_10px_28px_rgba(255,209,102,0.5)]">
          <defs>
            <linearGradient id="gold-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffe9a8" />
              <stop offset="45%" stopColor="#ffd166" />
              <stop offset="100%" stopColor="#e0a422" />
            </linearGradient>
          </defs>
          {/* handles */}
          <g fill="none" stroke="url(#gold-grad)" strokeWidth="4.5">
            <path d="M28 24 C14 24 14 44 30 46" />
            <path d="M72 24 C86 24 86 44 70 46" />
          </g>
          {/* cup */}
          <path d="M28 18 H72 V34 C72 50 62 58 50 58 C38 58 28 50 28 34 Z" fill="url(#gold-grad)" stroke="#a9781a" strokeWidth="1.5" />
          {/* stem + base */}
          <rect x="46" y="58" width="8" height="12" fill="url(#gold-grad)" />
          <rect x="36" y="70" width="28" height="6" rx="2" fill="url(#gold-grad)" />
          <rect x="32" y="76" width="36" height="7" rx="2.5" fill="url(#gold-grad)" stroke="#a9781a" strokeWidth="1" />
          {/* star */}
          <polygon points="50,26 53,34 61,34 55,39 57,47 50,42 43,47 45,39 39,34 47,34" fill="#fff8e1" opacity="0.9" />
        </svg>
        {/* shine sweep */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(115deg, transparent 42%, rgba(255,255,255,0.7) 50%, transparent 58%)",
          }}
          animate={{ x: ["-130%", "130%"] }}
          transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
}
