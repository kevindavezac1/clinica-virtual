import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
