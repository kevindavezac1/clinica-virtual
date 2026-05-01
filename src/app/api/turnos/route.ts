import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";
import { sendTurnoPendiente } from "@/lib/email";
import { isFeriado } from "@/lib/feriados";

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
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await validateRequest(req);
    const { nota, id_agenda, fecha, hora, id_paciente, id_cobertura } = await req.json();

    const feriadoCheck = await isFeriado(fecha);
    if (feriadoCheck.es) {
      return NextResponse.json(
        { codigo: -1, mensaje: `No se pueden asignar turnos en feriados (${feriadoCheck.descripcion})`, payload: [] },
        { status: 400 }
      );
    }

    // Mínimo 2 horas de anticipación (hora Argentina)
    const turnoDateTime = new Date(`${fecha}T${hora.padStart(5, "0")}:00-03:00`);
    const ahoraAR = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
    const diffHoras = (turnoDateTime.getTime() - ahoraAR.getTime()) / 3_600_000;
    if (diffHoras < 0.5) {
      return NextResponse.json(
        { codigo: -1, mensaje: "El turno debe solicitarse con al menos 30 minutos de anticipación.", payload: [] },
        { status: 400 }
      );
    }

    // Máximo 1 turno activo por especialidad
    const agendaInfo = await prisma.agenda.findUnique({
      where: { id: id_agenda },
      select: { id_especialidad: true },
    });
    if (agendaInfo) {
      const turnoActivo = await prisma.turno.findFirst({
        where: {
          id_paciente,
          estado: { in: ["Pendiente", "Confirmado"] },
          agenda: { id_especialidad: agendaInfo.id_especialidad },
        },
      });
      if (turnoActivo) {
        return NextResponse.json(
          { codigo: -1, mensaje: "Ya tenés un turno activo para esta especialidad. Cancelalo antes de sacar otro.", payload: [] },
          { status: 400 }
        );
      }
    }

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
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}
