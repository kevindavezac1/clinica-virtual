import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest, AuthError } from "@/lib/auth";
import { getFeriadosForYears } from "@/lib/feriados";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await validateRequest(req);
    const currentYear = new Date().getFullYear();
    const payload = await getFeriadosForYears([currentYear, currentYear + 1]);
    return NextResponse.json({ codigo: 200, payload });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un feriado para esa fecha" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
