import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest, AuthError } from "@/lib/auth";

export async function GET() {
  try {
    const rows = await prisma.cobertura.findMany({ select: { id: true, nombre: true } });
    return NextResponse.json(rows);
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
    const { nombre } = await req.json();
    if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }
    await prisma.cobertura.create({ data: { nombre: nombre.trim() } });
    return NextResponse.json({ message: "Cobertura creada correctamente" });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
