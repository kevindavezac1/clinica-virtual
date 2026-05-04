import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest, AuthError } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await validateRequest(req);
    const { id } = await params;

    const turnos = await prisma.turno.findMany({
      where: { id_paciente: Number(id) },
      select: {
        id: true,
        nota: true,
        estado: true,
        fecha: true,
        hora: true,
        id_paciente: true,
        id_cobertura: true,
        agenda: {
          select: {
            medico: { select: { nombre: true, apellido: true } },
            especialidad: { select: { id: true, descripcion: true } },
          },
        },
      },
    });

    const payload = turnos.map((t) => ({
      id_turno: t.id,
      nota: t.nota,
      estado: t.estado,
      fecha: t.fecha,
      hora: t.hora,
      id_paciente: t.id_paciente,
      id_cobertura: t.id_cobertura,
      nombre_medico: t.agenda.medico.nombre,
      apellido_medico: t.agenda.medico.apellido,
      id_especialidad: t.agenda.especialidad.id,
      especialidad: t.agenda.especialidad.descripcion,
    }));

    return NextResponse.json({ codigo: 200, mensaje: "OK", payload });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
