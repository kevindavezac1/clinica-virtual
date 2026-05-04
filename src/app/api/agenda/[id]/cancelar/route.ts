import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest, AuthError } from "@/lib/auth";
import { sendTurnoCanceladoPorMedico } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await validateRequest(req);
    const { id } = await params;
    const agendaId = Number(id);

    const agenda = await prisma.agenda.findUnique({
      where: { id: agendaId },
      include: { medico: true, especialidad: true },
    });
    if (!agenda) {
      return NextResponse.json({ error: "Agenda no encontrada" }, { status: 404 });
    }

    const turnosActivos = await prisma.turno.findMany({
      where: { id_agenda: agendaId, estado: { not: "Cancelado" } },
      include: { paciente: true },
    });

    // Cancel all active turns
    if (turnosActivos.length > 0) {
      await prisma.turno.updateMany({
        where: { id_agenda: agendaId, estado: { not: "Cancelado" } },
        data: { estado: "Cancelado" },
      });

      // Notify each patient — fire and don't await individually to avoid timeout
      const medicoNombre = `Dr/a. ${agenda.medico.apellido}, ${agenda.medico.nombre}`;
      const fechaFormateada = new Date(agenda.fecha + "T12:00:00Z").toLocaleDateString("es-AR", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
        timeZone: "America/Argentina/Buenos_Aires",
      });

      await Promise.allSettled(
        turnosActivos.map(t =>
          sendTurnoCanceladoPorMedico(
            t.paciente.email,
            `${t.paciente.nombre} ${t.paciente.apellido}`,
            fechaFormateada,
            t.hora,
            medicoNombre,
            agenda.especialidad.descripcion,
          )
        )
      );
    }

    // Delete cancelled turns then the agenda
    await prisma.turno.deleteMany({ where: { id_agenda: agendaId } });
    await prisma.agenda.delete({ where: { id: agendaId } });

    return NextResponse.json({
      codigo: 200,
      mensaje: "Agenda cancelada",
      turnosCancelados: turnosActivos.length,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
