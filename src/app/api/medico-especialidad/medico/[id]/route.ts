import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await validateRequest(req);
    const { id } = await params;
    const rows = await prisma.medicoEspecialidad.findMany({
      where: { id_medico: Number(id) },
      select: {
        id_medico: true,
        id_especialidad: true,
        especialidad: { select: { descripcion: true } },
      },
    });

    const payload = rows.map((r) => ({
      id_medico: r.id_medico,
      id_especialidad: r.id_especialidad,
      descripcion: r.especialidad.descripcion,
    }));

    return NextResponse.json({ codigo: 200, mensaje: "OK", payload });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await validateRequest(req);
    const { id_medico, id_especialidad } = await req.json();
    await prisma.medicoEspecialidad.create({ data: { id_medico, id_especialidad } });
    return NextResponse.json({ codigo: 200, mensaje: "OK", payload: [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}
