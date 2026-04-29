import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rows = await prisma.especialidad.findMany({ select: { id: true, descripcion: true } });
    return NextResponse.json({ codigo: 200, mensaje: "OK", payload: rows });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { descripcion } = await req.json();
    await prisma.especialidad.create({ data: { descripcion } });
    return NextResponse.json({ message: "Especialidad creada correctamente" });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
