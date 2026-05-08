import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken, generateRefreshToken } from "@/lib/auth";
import { isRateLimited, recordFailedAttempt, clearAttempts } from "@/lib/rateLimit";
import { sanitizeString } from "@/lib/sanitize";
import { hmacHex } from "@/lib/crypto";
import bcrypt from "bcryptjs";

const REFRESH_DAYS = 7;
const IP_MAX_ATTEMPTS = 20;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const ipKey = `login:ip:${ip}`;
    const ipCheck = await isRateLimited(ipKey);
    if (ipCheck.limited) {
      return NextResponse.json(
        { codigo: -1, mensaje: `Demasiados intentos desde tu red. Intentá en ${ipCheck.minutesLeft} minuto(s).`, payload: [] },
        { status: 429 }
      );
    }

    const body = await req.json();
    const usuario = sanitizeString(body.usuario);
    const password = typeof body.password === "string" ? body.password : "";

    const rateLimitKey = `login:${usuario}`;
    const { limited, minutesLeft } = await isRateLimited(rateLimitKey);
    if (limited) {
      return NextResponse.json(
        { codigo: -1, mensaje: `Demasiados intentos fallidos. Intentá en ${minutesLeft} minuto(s).`, payload: [] },
        { status: 429 }
      );
    }

    const user = await prisma.usuario.findFirst({
      where: { dni_hash: hmacHex(usuario ?? "") },
      select: { id: true, nombre: true, apellido: true, rol: true, password: true, email_verificado: true },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      await recordFailedAttempt(ipKey, IP_MAX_ATTEMPTS);
      const { attemptsLeft, blocked } = await recordFailedAttempt(rateLimitKey);
      const aviso = attemptsLeft <= 2 ? ` Te quedan ${attemptsLeft} intento(s).` : "";
      const mensaje = blocked
        ? "Demasiados intentos fallidos. Tu cuenta está bloqueada por 15 minutos."
        : `Usuario o contraseña incorrecta.${aviso}`;
      return NextResponse.json({ codigo: -1, mensaje, payload: [] });
    }

    if (!user.email_verificado) {
      return NextResponse.json(
        { codigo: -2, mensaje: "Debés verificar tu email antes de ingresar. Revisá tu casilla o solicitá un nuevo enlace.", payload: [] },
        { status: 403 }
      );
    }

    await clearAttempts(rateLimitKey);
    await clearAttempts(ipKey);
    const { password: _, email_verificado: __, ...userSafe } = user;

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
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
