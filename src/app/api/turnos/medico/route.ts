import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest, AuthError } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";

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
        nota_medico: true,
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
      nota: decrypt(t.nota),
      nota_medico: decrypt(t.nota_medico),
      estado: t.estado,
      cobertura: t.cobertura.nombre,
    }));

    return NextResponse.json({ codigo: 200, mensaje: "OK", payload });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
