import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest, AuthError } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await validateRequest(req);
    const { id } = await params;
    const rows = await prisma.medicoEspecialidad.findMany({
      where: { id_especialidad: Number(id) },
      select: {
        id_medico: true,
        id_especialidad: true,
        medico: { select: { nombre: true, apellido: true } },
      },
    });

    const payload = rows.map((r: any) => ({
      id_medico: r.id_medico,
      nombre: r.medico.nombre,
      apellido: r.medico.apellido,
      id_especialidad: r.id_especialidad,
    }));

    return NextResponse.json({ codigo: 200, mensaje: "OK", payload });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
