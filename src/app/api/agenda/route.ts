import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest, AuthError } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const payload = await validateRequest(req);
    if (payload.rol !== "Medico" && payload.rol !== "Administrador") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    const { id_medico, id_especialidad, fecha, hora_entrada, hora_salida, duracion = 30 } = await req.json();

    const existente = await prisma.agenda.findFirst({
      where: { id_medico, fecha: new Date(fecha) },
    });
    if (existente) {
      return NextResponse.json({ error: "Ya existe una agenda para este médico en esa fecha" }, { status: 409 });
    }

    const agenda = await prisma.agenda.create({
      data: { id_medico, id_especialidad, fecha: new Date(fecha), hora_entrada, hora_salida, duracion },
    });
    return NextResponse.json({ codigo: 200, mensaje: "OK", payload: [{ id_agenda: agenda.id }] });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
