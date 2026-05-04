export function sanitizeString(value: unknown, maxLength = 500): string {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .replace(/\0/g, "")
    .replace(/[<>]/g, "")
    .slice(0, maxLength);
}

export function sanitizeNote(value: unknown): string {
  return sanitizeString(value, 2000);
}

export function sanitizeEmail(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().toLowerCase().slice(0, 254);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed) ? trimmed : "";
}

export function sanitizeNumericId(value: unknown): number | null {
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : null;
}
