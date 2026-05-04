import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken, generateRefreshToken } from "@/lib/auth";

const REFRESH_DAYS = 7;

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

    // Rotate: delete old token, issue new one
    const newRefreshTokenValue = generateRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { id: stored.id } }),
      prisma.refreshToken.create({
        data: { token: newRefreshTokenValue, id_usuario: usuario.id, expires_at: expiresAt },
      }),
    ]);

    const accessToken = await signToken({ sub: usuario.id, id: usuario.id, name: usuario.nombre, rol: usuario.rol });

    const response = NextResponse.json({
      token: accessToken,
      user: { id: usuario.id, nombre: usuario.nombre, apellido: usuario.apellido, rol: usuario.rol },
    });

    response.cookies.set("refresh_token", newRefreshTokenValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
