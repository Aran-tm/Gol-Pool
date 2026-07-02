/** A single shimmering placeholder block. Shape it entirely with `className`
 *  (height, width, rounding) so it sits exactly over whatever it stands in for. */
export function Shimmer({ className }: { className?: string }) {
  return <div className={`shimmer ${className ?? ""}`} />;
}

/** Shimmering placeholder rows — shown while a first data load is in flight to
 *  avoid flashing an empty state. */
export default function Skeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <Shimmer key={i} className="h-16 rounded-2xl border border-white/10" />
      ))}
    </div>
  );
}
