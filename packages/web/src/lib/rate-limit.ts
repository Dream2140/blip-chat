// Simple in-memory rate limiter using sliding window
const hits = new Map<string, number[]>();

// Clean up old entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of hits) {
    const valid = timestamps.filter((t) => now - t < 60000);
    if (valid.length === 0) hits.delete(key);
    else hits.set(key, valid);
  }
}, 60000);

export function rateLimit(key: string, maxPerMinute: number): boolean {
  const now = Date.now();
  const timestamps = hits.get(key) || [];
  const recent = timestamps.filter((t) => now - t < 60000);

  if (recent.length >= maxPerMinute) return false; // rate limited

  recent.push(now);
  hits.set(key, recent);
  return true; // allowed
}
