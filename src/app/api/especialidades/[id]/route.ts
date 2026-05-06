import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest, AuthError } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await validateRequest(req);
    if (payload.rol !== "Administrador") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { id } = await params;
    const { descripcion } = await req.json();
    if (!descripcion || typeof descripcion !== "string" || !descripcion.trim()) {
      return NextResponse.json({ error: "Descripción requerida" }, { status: 400 });
    }
    await prisma.especialidad.update({ where: { id: Number(id) }, data: { descripcion: descripcion.trim() } });
    return NextResponse.json({ message: "Especialidad actualizada correctamente" });
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
    if (payload.rol !== "Administrador") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { id } = await params;
    const count = await prisma.medicoEspecialidad.count({ where: { id_especialidad: Number(id) } });
    if (count > 0) {
      return NextResponse.json({ message: "No se puede eliminar la especialidad porque tiene médicos asociados." }, { status: 400 });
    }
    await prisma.especialidad.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: "Especialidad eliminada correctamente" });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
