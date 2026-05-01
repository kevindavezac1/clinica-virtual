import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { nombre } = await req.json();
    await prisma.cobertura.update({ where: { id: Number(id) }, data: { nombre } });
    return NextResponse.json({ message: "Cobertura actualizada correctamente" });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const count = await prisma.usuario.count({ where: { id_cobertura: Number(id) } });
    if (count > 0) {
      return NextResponse.json({ message: "No se puede eliminar la cobertura porque tiene usuarios asociados." }, { status: 400 });
    }
    await prisma.cobertura.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Cobertura eliminada correctamente" });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}
