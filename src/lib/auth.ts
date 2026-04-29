import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_secret"
);

export async function signToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
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
  if (!token) throw new Error("Token no proporcionado");
  return verifyToken(token);
}
