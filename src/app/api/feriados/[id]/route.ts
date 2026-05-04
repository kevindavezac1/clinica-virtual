import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest, AuthError } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const jwtPayload = await validateRequest(req);
    if (jwtPayload.rol !== "Administrador") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }
    const { id } = await params;
    await prisma.feriado.delete({ where: { id: Number(id) } });
    return NextResponse.json({ codigo: 200, mensaje: "Feriado eliminado" });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
