import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await validateRequest(req);
    const { id_medico, id_especialidad, fecha, hora_entrada, hora_salida } = await req.json();
    const agenda = await prisma.agenda.create({
      data: { id_medico, id_especialidad, fecha: new Date(fecha), hora_entrada, hora_salida },
    });
    return NextResponse.json({ codigo: 200, mensaje: "OK", payload: [{ id_agenda: agenda.id }] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}
