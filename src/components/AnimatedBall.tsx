import { motion } from "framer-motion";

/** Pro animated soccer ball — SVG + framer-motion (float + slow spin + glow + shine sweep).
 *  Self-contained, no deps/assets. ponytail: swap for a Lottie asset here if ever wanted. */
export default function AnimatedBall({ size = 128, className }: { size?: number; className?: string }) {
  return (
    <div className={`relative ${className ?? ""}`} style={{ width: size, height: size }}>
      {/* glow */}
      <motion.div
        className="absolute inset-0 rounded-full bg-grass/30 blur-2xl"
        animate={{ opacity: [0.45, 0.8, 0.45], scale: [0.9, 1.05, 0.9] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="relative h-full w-full"
      >
        <motion.svg
          viewBox="0 0 100 100"
          className="h-full w-full drop-shadow-[0_8px_24px_rgba(34,197,94,0.4)]"
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        >
          <defs>
            <radialGradient id="ball-sheen" cx="38%" cy="32%" r="75%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="55%" stopColor="#e9eef2" />
              <stop offset="100%" stopColor="#b9c2cc" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="46" fill="url(#ball-sheen)" stroke="#0a0a0f" strokeWidth="2.5" />
          {/* central pentagon */}
          <polygon
            points="50,30 63,40 58,56 42,56 37,40"
            fill="#0a0a0f"
          />
          {/* spokes + outer pentagons hint */}
          <g stroke="#0a0a0f" strokeWidth="3.2" strokeLinecap="round" fill="none">
            <line x1="50" y1="30" x2="50" y2="12" />
            <line x1="63" y1="40" x2="80" y2="33" />
            <line x1="58" y1="56" x2="70" y2="72" />
            <line x1="42" y1="56" x2="30" y2="72" />
            <line x1="37" y1="40" x2="20" y2="33" />
          </g>
          <g fill="#0a0a0f">
            <circle cx="50" cy="12" r="4.5" />
            <circle cx="83" cy="31" r="4.5" />
            <circle cx="72" cy="74" r="4.5" />
            <circle cx="28" cy="74" r="4.5" />
            <circle cx="17" cy="31" r="4.5" />
          </g>
        </motion.svg>
        {/* shine sweep — clipped to a static circle so it stays on the ball */}
        <div className="pointer-events-none absolute inset-[7%] overflow-hidden rounded-full">
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(115deg, transparent 42%, rgba(255,255,255,0.6) 50%, transparent 58%)",
            }}
            animate={{ x: ["-130%", "130%"] }}
            transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </div>
  );
}
