import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";

interface EntradaAgenda {
  id_medico: number;
  id_especialidad: number;
  fecha: string;
  hora_entrada: string;
  hora_salida: string;
}

export async function POST(req: NextRequest) {
  try {
    await validateRequest(req);
    const { entries } = await req.json() as { entries: EntradaAgenda[] };
    if (!entries?.length) {
      return NextResponse.json({ error: "No se enviaron entradas" }, { status: 400 });
    }

    // Fetch existing agendas for this doctor to skip duplicates
    const idMedico = entries[0].id_medico;
    const fechas = entries.map(e => new Date(e.fecha));
    const existentes = await prisma.agenda.findMany({
      where: { id_medico: idMedico, fecha: { in: fechas } },
      select: { fecha: true, hora_entrada: true, hora_salida: true },
    });
    const existentesSet = new Set(
      existentes.map(a => `${a.fecha.toISOString().split("T")[0]}_${a.hora_entrada}_${a.hora_salida}`)
    );

    const nuevas = entries.filter(e => {
      const key = `${e.fecha}_${e.hora_entrada}_${e.hora_salida}`;
      return !existentesSet.has(key);
    });

    if (nuevas.length > 0) {
      await prisma.agenda.createMany({
        data: nuevas.map(e => ({
          id_medico: e.id_medico,
          id_especialidad: e.id_especialidad,
          fecha: new Date(e.fecha),
          hora_entrada: e.hora_entrada,
          hora_salida: e.hora_salida,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      codigo: 200,
      mensaje: "Agenda generada",
      creados: nuevas.length,
      omitidos: entries.length - nuevas.length,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}
