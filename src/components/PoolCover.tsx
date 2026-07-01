import { useState } from "react";
import { poolCover, poolGradient } from "../lib/poolCover";

/** Real football photo cover for a pool, with a deterministic gradient fallback. */
export default function PoolCover({
  poolId,
  className,
  w,
  h,
}: {
  poolId: string;
  className?: string;
  w?: number;
  h?: number;
}) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return <div className={className} style={{ backgroundImage: poolGradient(poolId) }} />;
  }
  return (
    <img
      src={poolCover(poolId, w, h)}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
      className={`object-cover ${className ?? ""}`}
    />
  );
}
