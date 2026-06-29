import { useLocation, useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { House, Radio, Trophy, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

const ITEMS: NavItem[] = [
  { icon: House, label: "Home", path: "/dashboard" },
  { icon: Radio, label: "Matches", path: "/matches" },
  { icon: Trophy, label: "Pools", path: "/pools" },
  { icon: User, label: "Profile", path: "/profile" },
];

export default function BottomNav() {
  const { connected } = useWallet();
  const location = useLocation();
  const navigate = useNavigate();

  // Hide when wallet not connected or on onboarding/landing.
  if (!connected) return null;

  const isActive = (path: string) => {
    if (path === "/dashboard" && location.pathname === "/dashboard") return true;
    if (path === "/matches" && location.pathname.startsWith("/matches")) return true;
    if (path === "/pools" && location.pathname.startsWith("/pools")) return true;
    if (path === "/profile" && location.pathname.startsWith("/profile")) return true;
    return false;
  };

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-safe">
      <div className="pointer-events-auto mx-auto flex w-full max-w-md items-center justify-around border-t border-white/10 bg-ink-950/80 px-2 py-2 backdrop-blur-xl">
        {ITEMS.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 transition ${
                active
                  ? "text-grass"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <item.icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-semibold tracking-wide">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
