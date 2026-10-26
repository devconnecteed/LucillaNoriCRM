// Limitatore in memoria a finestra fissa (protezione da tentativi ripetuti, es. password).
// Vale per singola istanza del server: con più istanze serve un archivio condiviso (es. Redis).

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimited(key: string, max: number, now = Date.now()) {
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) return { limited: false, retryInMs: 0 };
  return { limited: b.count >= max, retryInMs: b.resetAt - now };
}

export function recordFailure(key: string, windowMs: number, now = Date.now()) {
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) buckets.set(key, { count: 1, resetAt: now + windowMs });
  else b.count++;
  if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}

export const clearFailures = (key: string) => buckets.delete(key);
