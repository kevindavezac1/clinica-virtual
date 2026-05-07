import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ codigo: -1, mensaje: "Token inválido" }, { status: 400 });
    }

    const record = await prisma.emailVerificationToken.findUnique({ where: { token } });

    if (!record || record.used || record.expires_at < new Date()) {
      return NextResponse.json({ codigo: -1, mensaje: "El enlace es inválido o ya expiró" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: record.id_usuario },
        data: { email_verificado: true },
      }),
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { used: true },
      }),
    ]);

    return NextResponse.json({ codigo: 200, mensaje: "Email verificado correctamente" });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
