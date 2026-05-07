import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateResetToken } from "@/lib/auth";
import { sanitizeEmail } from "@/lib/sanitize";
import { sendEmailVerification } from "@/lib/email";
import { isRateLimited, recordFailedAttempt } from "@/lib/rateLimit";

const EXPIRY_HOURS = 24;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = sanitizeEmail(body.email);

    const rateLimitKey = `resend-verification:${email}`;
    const { limited, minutesLeft } = await isRateLimited(rateLimitKey);
    if (limited) {
      return NextResponse.json(
        { codigo: -1, mensaje: `Demasiados intentos. Intentá en ${minutesLeft} minuto(s).` },
        { status: 429 }
      );
    }
    await recordFailedAttempt(rateLimitKey);

    const usuario = await prisma.usuario.findFirst({ where: { email } });

    const mensajeGenerico = "Si el email existe y no está verificado, recibirás un nuevo enlace.";

    if (!usuario || usuario.email_verificado) {
      return NextResponse.json({ codigo: 200, mensaje: mensajeGenerico });
    }

    await prisma.emailVerificationToken.updateMany({
      where: { id_usuario: usuario.id, used: false },
      data: { used: true },
    });

    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: { token, id_usuario: usuario.id, expires_at: expiresAt },
    });

    await sendEmailVerification(email, `${usuario.nombre} ${usuario.apellido}`, token);

    return NextResponse.json({ codigo: 200, mensaje: mensajeGenerico });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
