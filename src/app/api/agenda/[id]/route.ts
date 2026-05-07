import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest, AuthError } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await validateRequest(req);
    if (payload.rol !== "Medico" && payload.rol !== "Administrador") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    const { id } = await params;
    const turnosActivos = await prisma.turno.count({
      where: { id_agenda: Number(id), estado: { not: "Cancelado" } },
    });
    if (turnosActivos > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: hay ${turnosActivos} turno${turnosActivos > 1 ? "s" : ""} activo${turnosActivos > 1 ? "s" : ""} para este día` },
        { status: 400 }
      );
    }
    await prisma.turno.deleteMany({ where: { id_agenda: Number(id), estado: "Cancelado" } });
    await prisma.agenda.delete({ where: { id: Number(id) } });
    return NextResponse.json({ codigo: 200, mensaje: "Horario eliminado", payload: [] });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await validateRequest(req);
    if (payload.rol !== "Medico" && payload.rol !== "Administrador") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    const { id } = await params;
    const { id_medico, id_especialidad, fecha, hora_entrada, hora_salida, duracion = 30 } = await req.json();

    const existing = await prisma.agenda.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return NextResponse.json({ codigo: -1, mensaje: "No existe agenda con el id proporcionado", payload: [] });
    }

    await prisma.agenda.update({
      where: { id: Number(id) },
      data: { id_medico, id_especialidad, fecha: new Date(fecha), hora_entrada, hora_salida, duracion },
    });

    return NextResponse.json({ codigo: 200, mensaje: "Agenda modificada", payload: [] });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
