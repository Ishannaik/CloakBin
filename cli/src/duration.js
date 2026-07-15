const MS = {
  w: 7 * 24 * 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  h: 60 * 60 * 1000,
  m: 60 * 1000,
};

const BUCKETS = [
  { name: '1h', ms: 3_600_000 },
  { name: '24h', ms: 86_400_000 },
  { name: '7d', ms: 604_800_000 },
  { name: '30d', ms: 2_592_000_000 },
  { name: '1y', ms: 31_536_000_000 },
];

const EXACT_BUCKETS = new Set(BUCKETS.map((b) => b.name));

/**
 * Parse a human duration like `2h30m`, `1w2d`, `45m`.
 * Units w/d/h/m, each at most once, any order, case-insensitive.
 * @param {string} str
 * @returns {number|null} total milliseconds > 0, or null
 */
export function parseDuration(str) {
  if (str == null || typeof str !== 'string' || str === '') return null;

  // whole-string: one or more (\d+[wdhm]), each unit at most once
  if (!/^(\d+[wdhm])+$/i.test(str)) return null;

  const re = /(\d+)([wdhm])/gi;
  const seen = new Set();
  let total = 0;
  let m;
  while ((m = re.exec(str)) !== null) {
    const unit = m[2].toLowerCase();
    if (seen.has(unit)) return null; // unit repeated
    seen.add(unit);
    const n = Number(m[1]);
    if (!Number.isFinite(n) || n < 0) return null;
    total += n * MS[unit];
  }

  if (total <= 0) return null;
  return total;
}

/**
 * Resolve expiry string to a free-tier bucket.
 * @param {string} str
 * @returns {{ bucket: string, requestedMs: number, snapped: boolean, capped: boolean } | null}
 */
export function resolveExpiry(str) {
  if (str == null || typeof str !== 'string' || str === '') return null;

  if (EXACT_BUCKETS.has(str)) {
    const b = BUCKETS.find((x) => x.name === str);
    return {
      bucket: str,
      requestedMs: b.ms,
      snapped: false,
      capped: false,
    };
  }

  const requestedMs = parseDuration(str);
  if (requestedMs == null) return null;

  const max = BUCKETS[BUCKETS.length - 1];
  if (requestedMs > max.ms) {
    return {
      bucket: max.name,
      requestedMs,
      snapped: true,
      capped: true,
    };
  }

  const bucket = BUCKETS.find((b) => b.ms >= requestedMs);
  // always found since requestedMs <= max.ms
  return {
    bucket: bucket.name,
    requestedMs,
    snapped: bucket.ms !== requestedMs,
    capped: false,
  };
}

export { BUCKETS, EXACT_BUCKETS };
