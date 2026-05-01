import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";
import { sendTurnoConfirmado, sendTurnoCancelado, sendTurnoCanceladoPorPaciente } from "@/lib/email";

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
        data: { nota_medico: body.nota_medico ?? null },
      });
      return NextResponse.json({ codigo: 200, mensaje: "Nota clínica guardada", payload: [] });
    }

    const { estado } = body;
    const estadosValidos = ["Pendiente", "Confirmado", "Cancelado"];
    if (!estadosValidos.includes(estado)) {
      return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
    }

    // Pacientes solo pueden cancelar con +24hs de anticipación
    if (estado === "Cancelado" && jwtPayload.rol === "Paciente") {
      const turnoExistente = await prisma.turno.findUnique({
        where: { id: Number(id) },
        select: { fecha: true, hora: true },
      });
      if (turnoExistente) {
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
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await validateRequest(req);
    const { id } = await params;
    const { nota, id_agenda, fecha, hora, id_paciente, id_cobertura } = await req.json();
    await prisma.turno.update({
      where: { id: Number(id) },
      data: { nota, id_agenda, fecha: new Date(fecha), hora, id_paciente, id_cobertura },
    });
    return NextResponse.json({ codigo: 200, mensaje: "Turno modificado", payload: [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await validateRequest(req);
    const { id } = await params;
    await prisma.turno.delete({ where: { id: Number(id) } });
    return NextResponse.json({ codigo: 200, mensaje: "Turno eliminado", payload: [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}
