import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await validateRequest(req);
    const { id } = await params;
    const { estado } = await req.json();
    const estadosValidos = ["Pendiente", "Confirmado", "Cancelado"];
    if (!estadosValidos.includes(estado)) {
      return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
    }
    await prisma.turno.update({ where: { id: Number(id) }, data: { estado } });
    return NextResponse.json({ codigo: 200, mensaje: "Estado actualizado", payload: [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await validateRequest(req);
    const { id } = await params;
    const { nota, id_agenda, fecha, hora, id_paciente, id_cobertura } = await req.json();
    await prisma.turno.update({
      where: { id: Number(id) },
      data: { nota, id_agenda, fecha: new Date(fecha), hora, id_paciente, id_cobertura },
    });
    return NextResponse.json({ codigo: 200, mensaje: "Turno modificado", payload: [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await validateRequest(req);
    const { id } = await params;
    await prisma.turno.delete({ where: { id: Number(id) } });
    return NextResponse.json({ codigo: 200, mensaje: "Turno eliminado", payload: [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
