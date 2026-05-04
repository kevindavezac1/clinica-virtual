import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest, AuthError } from "@/lib/auth";

export async function GET() {
  try {
    const rows = await prisma.especialidad.findMany({ select: { id: true, descripcion: true } });
    return NextResponse.json({ codigo: 200, mensaje: "OK", payload: rows });
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: (error as { status?: number }).status ?? 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await validateRequest(req);
    if (payload.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { descripcion } = await req.json();
    if (!descripcion || typeof descripcion !== "string" || !descripcion.trim()) {
      return NextResponse.json({ error: "Descripción requerida" }, { status: 400 });
    }
    await prisma.especialidad.create({ data: { descripcion: descripcion.trim() } });
    return NextResponse.json({ message: "Especialidad creada correctamente" });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
