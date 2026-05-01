import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";

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
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}
