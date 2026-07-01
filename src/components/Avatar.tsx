// Avatar: shows a chosen NFT image when `src` is set, else a deterministic gradient
// (same wallet → same colors forever). Falls back to the gradient if the image fails.

import { useState } from "react";

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
  /** Optional image (e.g. an NFT). Falls back to the gradient on load error. */
  src?: string | null;
}

export default function Avatar({ wallet, name, size = 36, className, src }: Props) {
  const [broken, setBroken] = useState(false);

  if (src && !broken) {
    return (
      <img
        src={src}
        alt={name ?? "avatar"}
        onError={() => setBroken(true)}
        className={`inline-block shrink-0 rounded-full object-cover ${className ?? ""}`}
        style={{ width: size, height: size }}
      />
    );
  }

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
