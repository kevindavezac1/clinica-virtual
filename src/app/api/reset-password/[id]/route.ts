import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await validateRequest(req);
    const { id } = await params;
    const { password } = await req.json();

    const result = await prisma.usuario.updateMany({
      where: { id: Number(id) },
      data: { password: await bcrypt.hash(password, 10) },
    });

    if (result.count === 1) {
      return NextResponse.json({ codigo: 200, mensaje: "Contraseña restablecida", payload: [] });
    }
    return NextResponse.json({ codigo: -1, mensaje: "Usuario no encontrado", payload: [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}
