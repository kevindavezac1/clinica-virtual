const store = new Map<string, { count: number; windowStart: number; blockedUntil?: number }>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;

export function isRateLimited(key: string): { limited: boolean; minutesLeft?: number } {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry) return { limited: false };
  if (entry.blockedUntil) {
    if (now < entry.blockedUntil) {
      return { limited: true, minutesLeft: Math.ceil((entry.blockedUntil - now) / 60000) };
    }
    store.delete(key);
  }
  return { limited: false };
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(key, { count: 1, windowStart: now });
    return;
  }
  const newCount = entry.count + 1;
  if (newCount >= MAX_ATTEMPTS) {
    store.set(key, { ...entry, count: newCount, blockedUntil: now + BLOCK_MS });
  } else {
    store.set(key, { ...entry, count: newCount });
  }
}

export function clearAttempts(key: string): void {
  store.delete(key);
}
