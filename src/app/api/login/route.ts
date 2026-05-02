import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken, generateRefreshToken } from "@/lib/auth";
import { isRateLimited, recordFailedAttempt, clearAttempts } from "@/lib/rateLimit";
import { sanitizeString } from "@/lib/sanitize";
import bcrypt from "bcryptjs";

const REFRESH_DAYS = 7;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    const body = await req.json();
    const usuario = sanitizeString(body.usuario);
    const password = typeof body.password === "string" ? body.password : "";

    const rateLimitKey = `${ip}:${usuario}`;
    const { limited, minutesLeft } = isRateLimited(rateLimitKey);
    if (limited) {
      return NextResponse.json(
        { codigo: -1, mensaje: `Demasiados intentos fallidos. Intentá en ${minutesLeft} minuto(s).`, payload: [] },
        { status: 429 }
      );
    }

    const user = await prisma.usuario.findFirst({
      where: { dni: usuario },
      select: { id: true, nombre: true, apellido: true, rol: true, password: true },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json({ codigo: -1, mensaje: "Usuario o contraseña incorrecta", payload: [] });
    }

    clearAttempts(rateLimitKey);
    const { password: _, ...userSafe } = user;

    const accessToken = await signToken({ sub: userSafe.id, id: userSafe.id, name: userSafe.nombre, rol: userSafe.rol });
    const refreshTokenValue = generateRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: { token: refreshTokenValue, id_usuario: user.id, expires_at: expiresAt },
    });

    const response = NextResponse.json({ codigo: 200, mensaje: "OK", payload: userSafe, jwt: accessToken });
    response.cookies.set("refresh_token", refreshTokenValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}
