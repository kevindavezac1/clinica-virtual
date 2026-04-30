import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validatePassword } from "@/lib/validatePassword";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ codigo: -1, mensaje: "Token inválido" }, { status: 400 });
    }

    const pwCheck = validatePassword(password ?? "");
    if (!pwCheck.valid) {
      return NextResponse.json({ codigo: -1, mensaje: pwCheck.error }, { status: 400 });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });

    if (!resetToken || resetToken.used || resetToken.expires_at < new Date()) {
      return NextResponse.json({ codigo: -1, mensaje: "El enlace es inválido o ya expiró" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: resetToken.id_usuario },
        data: { password: await bcrypt.hash(password, 10) },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
      // Revoke all refresh tokens so existing sessions are invalidated
      prisma.refreshToken.deleteMany({ where: { id_usuario: resetToken.id_usuario } }),
    ]);

    return NextResponse.json({ codigo: 200, mensaje: "Contraseña actualizada correctamente" });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
