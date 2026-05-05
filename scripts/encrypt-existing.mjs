/**
 * One-time migration: encrypts existing plaintext dni, telefono, nota, nota_medico in DB.
 * Run ONCE after deploying the encryption changes:
 *   node scripts/encrypt-existing.mjs
 *
 * Safe to re-run: skips already-encrypted values (detected by ":" format).
 */

import { createCipheriv, createHmac, randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually
const envPath = join(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
}

const KEY_HEX = process.env.ENCRYPTION_KEY;
if (!KEY_HEX || KEY_HEX.length !== 64) {
  console.error("ENCRYPTION_KEY missing or invalid in .env.local");
  process.exit(1);
}

const key = Buffer.from(KEY_HEX, "hex");
const HMAC_SECRET = `hmac:${KEY_HEX}`;

function isEncrypted(value) {
  if (!value) return true;
  const parts = value.split(":");
  return parts.length === 3 && parts[0].length === 24 && parts[1].length === 32;
}

function encrypt(text) {
  if (!text) return text;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

function hmacHex(text) {
  return createHmac("sha256", HMAC_SECRET)
    .update(text.trim().toLowerCase())
    .digest("hex");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // --- Usuarios: encrypt dni + telefono, set dni_hash ---
  const usuarios = await prisma.usuario.findMany({
    select: { id: true, dni: true, telefono: true, dni_hash: true },
  });

  let usersUpdated = 0;
  for (const u of usuarios) {
    const needsDni = !isEncrypted(u.dni);
    const needsTel = !isEncrypted(u.telefono);
    const needsHash = !u.dni_hash;

    if (!needsDni && !needsTel && !needsHash) continue;

    const dniPlain = needsDni ? u.dni : null;
    const updateData = {};

    if (needsDni) updateData.dni = encrypt(u.dni);
    if (needsTel) updateData.telefono = encrypt(u.telefono);
    if (needsHash && dniPlain) updateData.dni_hash = hmacHex(dniPlain);

    await prisma.usuario.update({ where: { id: u.id }, data: updateData });
    usersUpdated++;
  }
  console.log(`Usuarios migrados: ${usersUpdated} / ${usuarios.length}`);

  // --- Turnos: encrypt nota + nota_medico ---
  const turnos = await prisma.turno.findMany({
    select: { id: true, nota: true, nota_medico: true },
  });

  let turnosUpdated = 0;
  for (const t of turnos) {
    const needsNota = t.nota && !isEncrypted(t.nota);
    const needsNotaMedico = t.nota_medico && !isEncrypted(t.nota_medico);

    if (!needsNota && !needsNotaMedico) continue;

    const updateData = {};
    if (needsNota) updateData.nota = encrypt(t.nota);
    if (needsNotaMedico) updateData.nota_medico = encrypt(t.nota_medico);

    await prisma.turno.update({ where: { id: t.id }, data: updateData });
    turnosUpdated++;
  }
  console.log(`Turnos migrados: ${turnosUpdated} / ${turnos.length}`);

  console.log("Migración completa.");
}

main()
  .catch((e) => { console.error(e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
