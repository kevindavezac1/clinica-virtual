import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const refreshTokenValue = req.cookies.get("refresh_token")?.value;
    if (!refreshTokenValue) {
      return NextResponse.json({ error: "No refresh token" }, { status: 401 });
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenValue },
      include: { usuario: { select: { id: true, nombre: true, apellido: true, rol: true } } },
    });

    if (!stored || stored.expires_at < new Date()) {
      if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
      const res = NextResponse.json({ error: "Token inválido o expirado" }, { status: 401 });
      res.cookies.delete("refresh_token");
      return res;
    }

    const { usuario } = stored;
    const accessToken = await signToken({ sub: usuario.id, id: usuario.id, name: usuario.nombre, rol: usuario.rol });

    return NextResponse.json({
      token: accessToken,
      user: { id: usuario.id, nombre: usuario.nombre, apellido: usuario.apellido, rol: usuario.rol },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
