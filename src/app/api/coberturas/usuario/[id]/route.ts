import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const usuario = await prisma.usuario.findUnique({
      where: { id: Number(id) },
      include: { cobertura: { select: { id: true, nombre: true } } },
    });

    if (!usuario?.cobertura) {
      return NextResponse.json({ codigo: 404, mensaje: "Cobertura no encontrada para el usuario" }, { status: 404 });
    }

    return NextResponse.json({ codigo: 200, payload: usuario.cobertura, mensaje: "Cobertura obtenida exitosamente" });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}
