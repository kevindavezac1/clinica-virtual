import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";
import { sendTurnoPendiente } from "@/lib/email";

function formatFecha(fecha: Date): string {
  return fecha.toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export async function GET(req: NextRequest) {
  try {
    await validateRequest(req);
    const fecha = req.nextUrl.searchParams.get("fecha");
    if (!fecha) return NextResponse.json({ error: "Falta el parámetro fecha" }, { status: 400 });

    const turnos = await prisma.turno.findMany({
      where: { fecha: new Date(fecha) },
      select: {
        id: true,
        hora: true,
        estado: true,
        nota: true,
        paciente: { select: { nombre: true, apellido: true } },
        cobertura: { select: { nombre: true } },
        agenda: {
          select: {
            medico: { select: { nombre: true, apellido: true } },
            especialidad: { select: { descripcion: true } },
          },
        },
      },
      orderBy: { hora: "asc" },
    });

    const payload = turnos.map(t => ({
      id_turno: t.id,
      hora: t.hora,
      estado: t.estado,
      nota: t.nota,
      nombre_paciente: `${t.paciente.apellido}, ${t.paciente.nombre}`,
      nombre_medico: `${t.agenda.medico.apellido}, ${t.agenda.medico.nombre}`,
      especialidad: t.agenda.especialidad.descripcion,
      cobertura: t.cobertura.nombre,
    }));

    return NextResponse.json({ codigo: 200, mensaje: "OK", payload });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await validateRequest(req);
    const { nota, id_agenda, fecha, hora, id_paciente, id_cobertura } = await req.json();

    const turno = await prisma.turno.create({
      data: { nota, id_agenda, fecha: new Date(fecha), hora, id_paciente, id_cobertura },
      include: {
        paciente: { select: { nombre: true, apellido: true } },
        agenda: {
          include: {
            medico: { select: { nombre: true, apellido: true, email: true } },
            especialidad: { select: { descripcion: true } },
          },
        },
      },
    });

    const { paciente, agenda } = turno;
    sendTurnoPendiente(
      agenda.medico.email,
      `Dr/a. ${agenda.medico.nombre} ${agenda.medico.apellido}`,
      `${paciente.nombre} ${paciente.apellido}`,
      formatFecha(turno.fecha),
      hora,
      agenda.especialidad.descripcion
    ).catch(console.error);

    return NextResponse.json({ codigo: 200, message: "Turno asignado correctamente", payload: [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
