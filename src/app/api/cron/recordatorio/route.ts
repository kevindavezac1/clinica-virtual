import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendRecordatorio } from "@/lib/email";
import { sendRecordatorioWhatsApp } from "@/lib/whatsapp";
import { decrypt } from "@/lib/crypto";

function formatFecha(fecha: Date): string {
  return fecha.toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hoy = new Date();
  const manana = new Date(hoy);
  manana.setDate(hoy.getDate() + 1);
  manana.setHours(0, 0, 0, 0);

  const pasadoManana = new Date(manana);
  pasadoManana.setDate(manana.getDate() + 1);

  const turnos = await prisma.turno.findMany({
    where: {
      fecha: { gte: manana, lt: pasadoManana },
      estado: "Confirmado",
      recordatorio_enviado: false,
    },
    include: {
      paciente: { select: { nombre: true, apellido: true, email: true, telefono: true } },
      agenda: {
        include: {
          medico: { select: { nombre: true, apellido: true } },
          especialidad: { select: { descripcion: true } },
        },
      },
    },
  });

  let enviados = 0;
  const errores: number[] = [];

  for (const turno of turnos) {
    try {
      const paciente = `${turno.paciente.nombre} ${turno.paciente.apellido}`;
      const fecha = formatFecha(turno.fecha);
      const medico = `Dr/a. ${turno.agenda.medico.nombre} ${turno.agenda.medico.apellido}`;
      const especialidad = turno.agenda.especialidad.descripcion;

      await sendRecordatorio(turno.paciente.email, paciente, fecha, turno.hora, medico, especialidad);

      const telefonoDecriptado = decrypt(turno.paciente.telefono);
      if (telefonoDecriptado) {
        try {
          await sendRecordatorioWhatsApp(telefonoDecriptado, paciente, fecha, turno.hora, medico, especialidad);
        } catch (wErr) {
          console.error(`[cron/recordatorio] WhatsApp error turno ${turno.id}:`, wErr);
        }
      }

      await prisma.turno.update({
        where: { id: turno.id },
        data: { recordatorio_enviado: true },
      });
      enviados++;
    } catch (err) {
      console.error(`[cron/recordatorio] Error turno ${turno.id}:`, err);
      errores.push(turno.id);
    }
  }

  return NextResponse.json({ enviados, errores });
}
