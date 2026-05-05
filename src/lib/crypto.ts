import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "crypto";

const KEY_HEX = process.env.ENCRYPTION_KEY!;

function getKey(): Buffer {
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 64-char hex string (32 bytes)");
  }
  return Buffer.from(KEY_HEX, "hex");
}

export function encrypt(text: string | null | undefined): string | null {
  if (text == null || text === "") return text ?? null;
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(text: string | null | undefined): string | null {
  if (text == null || text === "") return text ?? null;
  // Plaintext passthrough — handles unencrypted data during migration window
  if (!text.includes(":")) return text;
  const parts = text.split(":");
  if (parts.length !== 3) return text;
  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encryptedBuf = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encryptedBuf).toString("utf8") + decipher.final("utf8");
}

// Deterministic HMAC for equality lookups (e.g. DNI login lookup)
export function hmacHex(text: string): string {
  return createHmac("sha256", `hmac:${KEY_HEX}`)
    .update(text.trim().toLowerCase())
    .digest("hex");
}
