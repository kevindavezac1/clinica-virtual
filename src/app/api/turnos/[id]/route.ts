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
    const { estado } = await req.json();
    const estadosValidos = ["Pendiente", "Confirmado", "Cancelado"];
    if (!estadosValidos.includes(estado)) {
      return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
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
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
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
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await validateRequest(req);
    const { id } = await params;
    await prisma.turno.delete({ where: { id: Number(id) } });
    return NextResponse.json({ codigo: 200, mensaje: "Turno eliminado", payload: [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
