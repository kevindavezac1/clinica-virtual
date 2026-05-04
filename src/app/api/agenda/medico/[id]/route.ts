import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest, AuthError } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await validateRequest(req);
    const { id } = await params;
    const rows = await prisma.agenda.findMany({
      where: { id_medico: Number(id) },
      include: { _count: { select: { turnos: { where: { estado: { not: "Cancelado" } } } } } },
    });

    const payload = rows.map(({ _count, ...a }) => ({ ...a, turnosActivos: _count.turnos }));

    if (rows.length > 0) {
      return NextResponse.json({ codigo: 200, mensaje: "OK", payload });
    }
    return NextResponse.json({ codigo: 200, mensaje: "Médico no posee agenda", payload: [] });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
