import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { descripcion } = await req.json();
    await prisma.especialidad.update({ where: { id: Number(id) }, data: { descripcion } });
    return NextResponse.json({ message: "Especialidad actualizada correctamente" });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const count = await prisma.medicoEspecialidad.count({ where: { id_especialidad: Number(id) } });
    if (count > 0) {
      return NextResponse.json({ message: "No se puede eliminar la especialidad porque tiene médicos asociados." }, { status: 400 });
    }
    await prisma.especialidad.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Especialidad eliminada correctamente" });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}
