import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await validateRequest(req);
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
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}
