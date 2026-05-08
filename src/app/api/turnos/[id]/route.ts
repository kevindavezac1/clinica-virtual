import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest, AuthError } from "@/lib/auth";
import { sendTurnoConfirmado, sendTurnoCancelado, sendTurnoCanceladoPorPaciente } from "@/lib/email";
import { encrypt } from "@/lib/crypto";

function formatFecha(fecha: Date): string {
  return fecha.toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const jwtPayload = await validateRequest(req);
    const { id } = await params;
    const body = await req.json();

    if ("nota_medico" in body) {
      if (jwtPayload.rol !== "Medico") {
        return NextResponse.json({ error: "Solo el médico puede editar la nota clínica" }, { status: 403 });
      }
      await prisma.turno.update({
        where: { id: Number(id) },
        data: { nota_medico: body.nota_medico ? encrypt(body.nota_medico) : null },
      });
      return NextResponse.json({ codigo: 200, mensaje: "Nota clínica guardada", payload: [] });
    }

    const { estado } = body;
    const estadosValidos = ["Pendiente", "Confirmado", "Cancelado", "Realizado", "Ausente"];
    if (!estadosValidos.includes(estado)) {
      return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
    }

    // Solo médico o admin pueden marcar Realizado/Ausente, y el turno debe haber pasado
    if (estado === "Realizado" || estado === "Ausente") {
      if (jwtPayload.rol !== "Medico" && jwtPayload.rol !== "Administrador") {
        return NextResponse.json({ error: "Solo el médico puede marcar este estado" }, { status: 403 });
      }
      const turnoExistente = await prisma.turno.findUnique({
        where: { id: Number(id) },
        select: { fecha: true, hora: true },
      });
      if (turnoExistente) {
        const turnoDateTime = new Date(`${turnoExistente.fecha.toISOString().split("T")[0]}T${turnoExistente.hora.padStart(5, "0")}:00-03:00`);
        const ahoraAR = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
        if (turnoDateTime > ahoraAR) {
          return NextResponse.json({ error: "Solo podés marcar como Realizado o Ausente turnos que ya pasaron" }, { status: 400 });
        }
      }
    }

    // Pacientes solo pueden cancelar su propio turno con +24hs de anticipación
    if (estado === "Cancelado" && jwtPayload.rol === "Paciente") {
      const turnoExistente = await prisma.turno.findUnique({
        where: { id: Number(id) },
        select: { fecha: true, hora: true, id_paciente: true },
      });
      if (!turnoExistente || turnoExistente.id_paciente !== Number(jwtPayload.id)) {
        return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
      }
      const turnoDateTime = new Date(`${turnoExistente.fecha.toISOString().split("T")[0]}T${turnoExistente.hora.padStart(5, "0")}:00-03:00`);
      const ahoraAR = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
      const diffHoras = (turnoDateTime.getTime() - ahoraAR.getTime()) / 3_600_000;
      if (diffHoras < 24) {
        return NextResponse.json(
          { codigo: -1, mensaje: "No podés cancelar con menos de 24hs de anticipación. Llamá al consultorio: +54 3496 417428", payload: [] },
          { status: 400 }
        );
      }
    }

    const turno = await prisma.turno.update({
      where: { id: Number(id) },
      data: { estado },
      include: {
        paciente: { select: { nombre: true, apellido: true, email: true } },
        agenda: {
          include: {
            medico: { select: { nombre: true, apellido: true, email: true } },
            especialidad: { select: { descripcion: true } },
          },
        },
      },
    });

    const { paciente, agenda, fecha, hora } = turno;
    const nombrePaciente = `${paciente.nombre} ${paciente.apellido}`;
    const nombreMedico = `Dr/a. ${agenda.medico.nombre} ${agenda.medico.apellido}`;
    const fechaStr = formatFecha(fecha);
    const rolActor = jwtPayload.rol as string;

    if (estado === "Confirmado") {
      sendTurnoConfirmado(paciente.email, nombrePaciente, fechaStr, hora, nombreMedico, agenda.especialidad.descripcion).catch(console.error);
    } else if (estado === "Cancelado") {
      if (rolActor === "Paciente") {
        // Patient cancelled → notify doctor
        sendTurnoCanceladoPorPaciente(agenda.medico.email, nombreMedico, nombrePaciente, fechaStr, hora).catch(console.error);
      } else {
        // Doctor/operator cancelled → notify patient
        sendTurnoCancelado(paciente.email, nombrePaciente, fechaStr, hora, nombreMedico).catch(console.error);
      }
    }

    return NextResponse.json({ codigo: 200, mensaje: "Estado actualizado", payload: [] });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

