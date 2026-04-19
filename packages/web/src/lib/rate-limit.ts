// Fixed-window rate limiter with automatic cleanup
// Uses Map<key, { count: number; windowStart: number }>
const windows = new Map<string, { count: number; windowStart: number }>();

// Cleanup stale windows every 2 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, w] of windows) {
      if (now - w.windowStart > 120000) windows.delete(key);
    }
  }, 120000);
}

export function rateLimit(key: string, maxPerMinute: number): boolean {
  const now = Date.now();
  const window = windows.get(key);

  if (!window || now - window.windowStart >= 60000) {
    // New window
    windows.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (window.count >= maxPerMinute) return false;

  window.count++;
  return true;
}
