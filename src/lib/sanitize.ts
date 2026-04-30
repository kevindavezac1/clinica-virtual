export function sanitizeString(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\0/g, "");
}
