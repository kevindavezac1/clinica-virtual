import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;

export async function isRateLimited(key: string): Promise<{ limited: boolean; minutesLeft?: number }> {
  const now = new Date();
  const entry = await prisma.loginAttempt.findUnique({ where: { key } });
  if (!entry) return { limited: false };

  if (entry.blocked_until) {
    if (now < entry.blocked_until) {
      const minutesLeft = Math.ceil((entry.blocked_until.getTime() - now.getTime()) / 60000);
      return { limited: true, minutesLeft };
    }
    await prisma.loginAttempt.delete({ where: { key } });
  }

  return { limited: false };
}

export async function recordFailedAttempt(key: string): Promise<{ attemptsLeft: number; blocked: boolean }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);

  const entry = await prisma.loginAttempt.findUnique({ where: { key } });

  if (!entry || entry.window_start < windowStart) {
    await prisma.loginAttempt.upsert({
      where: { key },
      create: { key, count: 1, window_start: now },
      update: { count: 1, window_start: now, blocked_until: null },
    });
    return { attemptsLeft: MAX_ATTEMPTS - 1, blocked: false };
  }

  const newCount = entry.count + 1;
  const blocked = newCount >= MAX_ATTEMPTS;
  await prisma.loginAttempt.update({
    where: { key },
    data: {
      count: newCount,
      blocked_until: blocked ? new Date(now.getTime() + BLOCK_MS) : null,
    },
  });
  return { attemptsLeft: Math.max(0, MAX_ATTEMPTS - newCount), blocked };
}

export async function clearAttempts(key: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { key } }).catch(() => {});
}
