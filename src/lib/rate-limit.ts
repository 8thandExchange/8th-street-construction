/**
 * Tiny in-memory sliding-window rate limiter. No dependencies.
 *
 * NOTE: state lives in module scope, so on serverless platforms this is
 * per-instance, best-effort throttling only — each warm instance keeps its
 * own window, and cold starts reset it. Good enough as a first line of
 * defense against naive form spam; use a shared store (e.g. Upstash/Redis)
 * if you need a hard global limit.
 */

const hits = new Map<string, number[]>();

/**
 * Returns true when the request is allowed, false when `identifier` has
 * exceeded `limit` calls within the trailing `windowMs`.
 */
export function checkRateLimit(
  identifier: string,
  limit = 5,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;

  // Prune stale entries so the map doesn't grow unbounded
  for (const [key, timestamps] of hits) {
    const fresh = timestamps.filter((t) => t > cutoff);
    if (fresh.length === 0) hits.delete(key);
    else hits.set(key, fresh);
  }

  const recent = hits.get(identifier) ?? [];
  if (recent.length >= limit) return false;

  recent.push(now);
  hits.set(identifier, recent);
  return true;
}
