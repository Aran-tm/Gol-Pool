// Deterministic real-photo cover per pool (football/stadium via LoremFlickr, no API key).
// `lock` makes the same pool always get the same photo. A gradient is the fallback.

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Real football/stadium photo URL, stable per pool id. */
export function poolCover(poolId: string, w = 640, h = 320): string {
  const seed = hash(poolId) % 5000;
  return `https://loremflickr.com/${w}/${h}/soccer,stadium,football?lock=${seed}`;
}

/** Deterministic gradient fallback (used if the photo fails to load). */
export function poolGradient(poolId: string): string {
  const hue = hash(poolId) % 360;
  return `linear-gradient(135deg, hsl(${hue} 60% 30%), hsl(${(hue + 40) % 360} 55% 18%))`;
}
