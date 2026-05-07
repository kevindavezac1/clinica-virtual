import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateResetToken } from "@/lib/auth";
import { sanitizeString } from "@/lib/sanitize";
import { sendPasswordReset } from "@/lib/email";
import { isRateLimited, recordFailedAttempt } from "@/lib/rateLimit";

const RESET_EXPIRY_MINUTES = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = sanitizeString(body.email).toLowerCase();

    const rateLimitKey = `forgot-password:${email}`;
    const { limited, minutesLeft } = await isRateLimited(rateLimitKey);
    if (limited) {
      return NextResponse.json(
        { codigo: -1, mensaje: `Demasiados intentos. Intentá en ${minutesLeft} minuto(s).` },
        { status: 429 }
      );
    }
    const { attemptsLeft } = await recordFailedAttempt(rateLimitKey);

    const usuario = await prisma.usuario.findFirst({ where: { email } });

    const mensajeBase = "Si el email existe, recibirás un enlace de recuperación.";
    const aviso = attemptsLeft <= 2 ? ` Te quedan ${attemptsLeft} intento(s) antes del bloqueo.` : "";

    if (!usuario) {
      return NextResponse.json({ codigo: 200, mensaje: `${mensajeBase}${aviso}` });
    }

    await prisma.passwordResetToken.deleteMany({ where: { id_usuario: usuario.id } });

    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + RESET_EXPIRY_MINUTES * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { token, id_usuario: usuario.id, expires_at: expiresAt },
    });

    await sendPasswordReset(email, `${usuario.nombre} ${usuario.apellido}`, token);

    return NextResponse.json({ codigo: 200, mensaje: `${mensajeBase}${aviso}` });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
