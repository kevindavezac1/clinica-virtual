import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const turnosCount = await prisma.turno.count({ where: { id_agenda: Number(id) } });
    if (turnosCount > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: hay ${turnosCount} turno${turnosCount > 1 ? "s" : ""} asignado${turnosCount > 1 ? "s" : ""} para este día` },
        { status: 400 }
      );
    }
    await prisma.agenda.delete({ where: { id: Number(id) } });
    return NextResponse.json({ codigo: 200, mensaje: "Horario eliminado", payload: [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await validateRequest(req);
    const { id } = await params;
    const { id_medico, id_especialidad, fecha, hora_entrada, hora_salida } = await req.json();

    const existing = await prisma.agenda.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return NextResponse.json({ codigo: -1, mensaje: "No existe agenda con el id proporcionado", payload: [] });
    }

    await prisma.agenda.update({
      where: { id: Number(id) },
      data: { id_medico, id_especialidad, fecha: new Date(fecha), hora_entrada, hora_salida },
    });

    return NextResponse.json({ codigo: 200, mensaje: "Agenda modificada", payload: [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}
