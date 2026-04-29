import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await validateRequest(req);
    const { id } = await params;
    const usuario = await prisma.usuario.findUnique({
      where: { id: Number(id) },
      include: { cobertura: { select: { nombre: true } } },
    });

    if (!usuario) {
      return NextResponse.json({ codigo: -1, mensaje: "Usuario no encontrado", payload: [] });
    }

    const { cobertura, ...rest } = usuario;
    return NextResponse.json({ codigo: 200, mensaje: "OK", payload: [{ ...rest, nombre_cobertura: cobertura?.nombre ?? null }] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await validateRequest(req);
    const { id } = await params;
    const { dni, apellido, nombre, fecha_nacimiento, password, rol, email, telefono, id_cobertura } = await req.json();

    await prisma.usuario.update({
      where: { id: Number(id) },
      data: { dni, apellido, nombre, fecha_nacimiento: new Date(fecha_nacimiento), password: await bcrypt.hash(password, 10), rol, email, telefono, id_cobertura: id_cobertura ? Number(id_cobertura) : null },
    });

    return NextResponse.json({ codigo: 200, mensaje: "Usuario modificado", payload: [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
