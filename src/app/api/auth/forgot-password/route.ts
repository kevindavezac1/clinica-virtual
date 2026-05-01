import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateResetToken } from "@/lib/auth";
import { sanitizeString } from "@/lib/sanitize";
import { sendPasswordReset } from "@/lib/email";

const RESET_EXPIRY_MINUTES = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = sanitizeString(body.email).toLowerCase();

    const usuario = await prisma.usuario.findFirst({ where: { email } });

    if (!usuario) {
      return NextResponse.json({ codigo: 200, mensaje: "Si el email existe, recibirás un enlace de recuperación." });
    }

    await prisma.passwordResetToken.deleteMany({ where: { id_usuario: usuario.id } });

    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + RESET_EXPIRY_MINUTES * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { token, id_usuario: usuario.id, expires_at: expiresAt },
    });

    await sendPasswordReset(email, `${usuario.nombre} ${usuario.apellido}`, token);

    return NextResponse.json({ codigo: 200, mensaje: "Si el email existe, recibirás un enlace de recuperación." });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}
