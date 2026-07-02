import { useState } from "react";
import { poolCover, poolGradient } from "../lib/poolCover";
import { Shimmer } from "./Skeleton";

/** Real football photo cover for a pool: shows a shimmer while the photo loads
 *  and a deterministic gradient fallback if it fails. */
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
  const [loaded, setLoaded] = useState(false);

  if (broken) {
    return <div className={className} style={{ backgroundImage: poolGradient(poolId) }} />;
  }
  return (
    <span className={`relative block overflow-hidden ${className ?? ""}`}>
      {!loaded && <Shimmer className="absolute inset-0" />}
      <img
        src={poolCover(poolId, w, h)}
        alt=""
        loading="lazy"
        // onLoad misses already-cached images, so also flip on mount if complete.
        ref={(el) => { if (el?.complete) setLoaded(true); }}
        onLoad={() => setLoaded(true)}
        onError={() => setBroken(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </span>
  );
}
