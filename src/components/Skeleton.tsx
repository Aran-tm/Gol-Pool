/** Pulsing placeholder rows — shown while first data load is in flight to avoid
 *  flashing an empty state. */
export default function Skeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
      ))}
    </div>
  );
}
