import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const refreshTokenValue = req.cookies.get("refresh_token")?.value;
  if (refreshTokenValue) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshTokenValue } }).catch(() => {});
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("refresh_token");
  return res;
}
