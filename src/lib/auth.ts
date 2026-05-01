import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { randomBytes } from "crypto";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_secret"
);

export class AuthError extends Error {
  readonly status = 401;
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export async function signToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);
}

export function generateRefreshToken(): string {
  return randomBytes(64).toString("hex");
}

export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, secret);
  return payload;
}

export function getTokenFromRequest(req: NextRequest): string | null {
  return req.headers.get("authorization");
}

export async function validateRequest(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) throw new AuthError("Token no proporcionado");
  try {
    return await verifyToken(token);
  } catch {
    throw new AuthError("Token inválido o expirado");
  }
}
