import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest, AuthError } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await validateRequest(req);
    if (payload.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { id } = await params;
    const { nombre } = await req.json();
    if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }
    await prisma.cobertura.update({ where: { id: Number(id) }, data: { nombre: nombre.trim() } });
    return NextResponse.json({ message: "Cobertura actualizada correctamente" });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await validateRequest(req);
    if (payload.rol !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { id } = await params;
    const count = await prisma.usuario.count({ where: { id_cobertura: Number(id) } });
    if (count > 0) {
      return NextResponse.json({ message: "No se puede eliminar la cobertura porque tiene usuarios asociados." }, { status: 400 });
    }
    await prisma.cobertura.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Cobertura eliminada correctamente" });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
