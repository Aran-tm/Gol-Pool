import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown } from "lucide-react";
import PageTransition from "../components/PageTransition";
import { POINTS } from "../lib/scoring";

const FAQ = [
  {
    q: "What is GolPool?",
    a: "GolPool is a World Cup sweepstake app. You create a pool with friends, everyone gets randomly assigned 4 teams, and the leaderboard updates live as goals are scored — no spreadsheets, no manual entry.",
  },
  {
    q: "Why do I need a Solana wallet?",
    a: "Your wallet is your identity — it proves who you are without passwords. Connecting is free and no funds are needed. The subscription to TxLINE (our live data provider) costs ~$0.02 in Solana fees, one time only.",
  },
  {
    q: "How are teams assigned?",
    a: "Teams are randomly distributed when a pool is created. Every team goes to exactly one player per pool. You get 4 teams — a mix of favorites and underdogs.",
  },
  {
    q: "What is TxLINE?",
    a: "TxLINE is a real-time sports data oracle on Solana. It provides live World Cup scores, goal events, and match status — all verified on-chain.",
  },
  {
    q: "Can I create multiple pools?",
    a: "Yes! Create as many pools as you want — one for work, one for family, one for your Discord server.",
  },
  {
    q: "Is there an entry fee?",
    a: "Not yet. Currently all pools are free. Future updates will add optional on-chain entry fees with winner-takes-all prize pots.",
  },
];

export default function HowToPlay() {
  const navigate = useNavigate();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <PageTransition className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-8 pb-24">
      <button
        onClick={() => navigate(-1)}
        className="mb-5 flex w-fit items-center gap-1 text-sm text-white/60 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <h1 className="text-2xl font-black">How to Play</h1>

      {/* Scoring */}
      <section className="mt-5">
        <h2 className="text-sm font-bold text-white/70">Scoring</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.04]">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/50">
                  Event
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-white/50">
                  Points
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/50">
                  When
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { event: "Goal scored", pts: POINTS.goal, when: "Live" },
                { event: "Win", pts: POINTS.win, when: "Full-time" },
                { event: "Draw", pts: POINTS.draw, when: "Full-time" },
                { event: "Clean sheet", pts: POINTS.cleanSheet, when: "Full-time" },
              ].map((r, i) => (
                <tr
                  key={r.event}
                  className={`border-b border-white/5 ${
                    i % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"
                  }`}
                >
                  <td className="px-4 py-2.5 font-semibold">{r.event}</td>
                  <td className="px-4 py-2.5 text-center font-black text-gold">
                    +{r.pts}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-white/50">
                    {r.when}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-white/35">
          Clean sheet = your team concedes zero goals in a match.
        </p>
      </section>

      {/* Example */}
      <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="text-xs font-bold text-white/60">Example</h3>
        <p className="mt-1 text-sm leading-relaxed text-white/50">
          If you own <span className="text-white">Brazil</span> and they win 3–1:
        </p>
        <ul className="mt-2 space-y-1 text-xs text-white/50">
          <li>
            <span className="font-bold text-gold">+6</span> — 3 goals × 2 pts
          </li>
          <li>
            <span className="font-bold text-gold">+3</span> — win bonus
          </li>
          <li className="font-bold text-white/70">
            = 9 total points
          </li>
        </ul>
      </section>

      {/* FAQ */}
      <section className="mt-6">
        <h2 className="text-sm font-bold text-white/70">FAQ</h2>
        <div className="mt-3 space-y-2">
          {FAQ.map((item, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <span className="text-sm font-semibold">{item.q}</span>
                <ChevronDown
                  className={`h-4 w-4 text-white/40 transition ${
                    open === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {open === i && (
                <div className="px-4 pb-4 text-sm leading-relaxed text-white/55">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </PageTransition>
  );
}
