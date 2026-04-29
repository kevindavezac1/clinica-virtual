import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await validateRequest(req);
    const { id_medico, fecha } = await req.json();

    const turnos = await prisma.turno.findMany({
      where: {
        agenda: { id_medico: Number(id_medico) },
        fecha: new Date(fecha),
      },
      select: {
        id: true,
        fecha: true,
        hora: true,
        nota: true,
        estado: true,
        paciente: { select: { apellido: true, nombre: true, fecha_nacimiento: true } },
        agenda: { select: { medico: { select: { apellido: true, nombre: true } } } },
        cobertura: { select: { nombre: true } },
      },
    });

    const payload = turnos.map((t) => ({
      id_turno: t.id,
      nombre_paciente: `${t.paciente.apellido}, ${t.paciente.nombre}`,
      fecha_nacimiento: t.paciente.fecha_nacimiento,
      nombre_medico: `${t.agenda.medico.apellido}, ${t.agenda.medico.nombre}`,
      fecha: t.fecha,
      hora: t.hora,
      nota: t.nota,
      estado: t.estado,
      cobertura: t.cobertura.nombre,
    }));

    return NextResponse.json({ codigo: 200, mensaje: "OK", payload });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
