/** In-memory sliding-window rate limiter (per key). */
const buckets = new Map();

export function rateLimit({ windowMs = 60_000, max = 20, keyFn } = {}) {
  return (req, res, next) => {
    const key = keyFn ? keyFn(req) : (req.user?.id || req.ip || 'anon');
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now - bucket.start >= windowMs) {
      bucket = { start: now, count: 0 };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    if (bucket.count > max) {
      return res.status(429).json({
        error: `Too many requests. Limit is ${max} per ${Math.round(windowMs / 1000)}s. Wait and try again.`,
        retryAfterSec: Math.ceil((windowMs - (now - bucket.start)) / 1000),
      });
    }
    next();
  };
}

/** Periodic cleanup so Map does not grow forever */
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (now - b.start > 15 * 60_000) buckets.delete(k);
  }
}, 60_000).unref?.();
