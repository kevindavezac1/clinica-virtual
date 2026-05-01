import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await validateRequest(req);

    const ahora = new Date();
    const inicioMes = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1));
    const finMes = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() + 1, 0));

    // Fecha de hoy en Argentina (UTC-3)
    const hoyAR = new Date(ahora.getTime() - 3 * 60 * 60 * 1000);
    const hoyStr = hoyAR.toISOString().split("T")[0];
    const hoy = new Date(hoyStr + "T00:00:00.000Z");

    const [
      turnosMes,
      turnosHoy,
      totalPacientes,
      totalMedicos,
      turnosPorEspecialidad,
      turnosProximos7,
    ] = await Promise.all([
      // Todos los turnos del mes con estado
      prisma.turno.groupBy({
        by: ["estado"],
        where: { fecha: { gte: inicioMes, lte: finMes } },
        _count: { id: true },
      }),
      // Turnos de hoy
      prisma.turno.count({ where: { fecha: hoy } }),
      // Total pacientes
      prisma.usuario.count({ where: { rol: "Paciente" } }),
      // Total médicos
      prisma.usuario.count({ where: { rol: "Medico" } }),
      // Top especialidades del mes
      prisma.turno.groupBy({
        by: ["id_agenda"],
        where: { fecha: { gte: inicioMes, lte: finMes }, estado: { not: "Cancelado" } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 20,
      }),
      // Turnos próximos 7 días (por fecha)
      prisma.turno.groupBy({
        by: ["fecha"],
        where: {
          fecha: { gte: hoy, lte: new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000) },
          estado: { not: "Cancelado" },
        },
        _count: { id: true },
        orderBy: { fecha: "asc" },
      }),
    ]);

    // Resolver especialidades de los top agendas
    const idAgendas = turnosPorEspecialidad.map(t => t.id_agenda);
    const agendas = await prisma.agenda.findMany({
      where: { id: { in: idAgendas } },
      select: { id: true, especialidad: { select: { descripcion: true } } },
    });
    const espMap = Object.fromEntries(agendas.map(a => [a.id, a.especialidad.descripcion]));

    // Agrupar por especialidad
    const espConteo: Record<string, number> = {};
    for (const t of turnosPorEspecialidad) {
      const nombre = espMap[t.id_agenda] ?? "Sin especialidad";
      espConteo[nombre] = (espConteo[nombre] ?? 0) + t._count.id;
    }
    const topEspecialidades = Object.entries(espConteo)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }));

    // Totales del mes
    const totalMes = turnosMes.reduce((s, t) => s + t._count.id, 0);
    const pendientes = turnosMes.find(t => t.estado === "Pendiente")?._count.id ?? 0;
    const confirmados = turnosMes.find(t => t.estado === "Confirmado")?._count.id ?? 0;
    const cancelados = turnosMes.find(t => t.estado === "Cancelado")?._count.id ?? 0;

    // Próximos 7 días
    const proximos7 = turnosProximos7.map(t => ({
      fecha: t.fecha.toISOString().split("T")[0],
      cantidad: t._count.id,
    }));

    return NextResponse.json({
      codigo: 200,
      payload: {
        turnosMes: { total: totalMes, pendientes, confirmados, cancelados },
        turnosHoy,
        totalPacientes,
        totalMedicos,
        topEspecialidades,
        proximos7,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}
