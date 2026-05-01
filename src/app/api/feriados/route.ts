import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";
import { getFeriadosForYears } from "@/lib/feriados";

export async function GET(req: NextRequest) {
  try {
    await validateRequest(req);
    const currentYear = new Date().getFullYear();
    const payload = await getFeriadosForYears([currentYear, currentYear + 1]);
    return NextResponse.json({ codigo: 200, payload });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const jwtPayload = await validateRequest(req);
    if (jwtPayload.rol !== "Administrador") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }
    const { fecha, descripcion } = await req.json();
    if (!fecha || !descripcion) {
      return NextResponse.json({ error: "Fecha y descripción requeridas" }, { status: 400 });
    }
    const feriado = await prisma.feriado.create({
      data: { fecha: new Date(fecha), descripcion },
    });
    return NextResponse.json({
      codigo: 200,
      payload: { id: feriado.id, fecha: feriado.fecha.toISOString().split("T")[0], descripcion: feriado.descripcion },
    });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "Ya existe un feriado para esa fecha" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: (error as { status?: number }).status ?? 500 });
  }
}
