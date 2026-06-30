// Deterministic gradient avatar from a wallet address. 0 deps.
// Same wallet → same colors forever, so a player is visually recognizable across pools.

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface Props {
  wallet: string;
  name?: string;
  size?: number;
  className?: string;
}

export default function Avatar({ wallet, name, size = 36, className }: Props) {
  const h = hash(wallet);
  const hue1 = h % 360;
  const hue2 = (hue1 + 55) % 360;
  const initial = (name?.trim()?.[0] ?? wallet[0] ?? "?").toUpperCase();
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full font-black text-ink-950 ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        backgroundImage: `linear-gradient(135deg, hsl(${hue1} 70% 58%), hsl(${hue2} 75% 48%))`,
      }}
    >
      {initial}
    </span>
  );
}
