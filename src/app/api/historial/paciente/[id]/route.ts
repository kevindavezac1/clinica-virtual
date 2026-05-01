import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await validateRequest(req);
    const { id } = await params;

    const turnos = await prisma.turno.findMany({
      where: {
        id_paciente: Number(id),
        estado: { not: "Cancelado" },
      },
      select: {
        id: true,
        fecha: true,
        hora: true,
        estado: true,
        nota: true,
        nota_medico: true,
        agenda: {
          select: {
            medico: { select: { nombre: true, apellido: true } },
            especialidad: { select: { descripcion: true } },
          },
        },
        cobertura: { select: { nombre: true } },
      },
      orderBy: { fecha: "desc" },
    });

    const payload = turnos.map(t => ({
      id_turno: t.id,
      fecha: t.fecha.toISOString().split("T")[0],
      hora: t.hora,
      estado: t.estado,
      nota_paciente: t.nota,
      nota_medico: t.nota_medico,
      medico: `Dr/a. ${t.agenda.medico.nombre} ${t.agenda.medico.apellido}`,
      especialidad: t.agenda.especialidad.descripcion,
      cobertura: t.cobertura.nombre,
    }));

    return NextResponse.json({ codigo: 200, mensaje: "OK", payload });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}
