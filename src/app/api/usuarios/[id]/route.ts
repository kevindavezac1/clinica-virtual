import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";
import { validatePassword } from "@/lib/validatePassword";
import { sanitizeString } from "@/lib/sanitize";
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

    const { password: _, cobertura, ...rest } = usuario;
    return NextResponse.json({
      codigo: 200, mensaje: "OK",
      payload: [{ ...rest, nombre_cobertura: cobertura?.nombre ?? null }],
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await validateRequest(req);
    const { id } = await params;
    const body = await req.json();
    const { dni, apellido, nombre, fecha_nacimiento, password, rol, email, telefono, id_cobertura } = body;

    const updateData: Record<string, unknown> = {
      dni: sanitizeString(dni),
      apellido: sanitizeString(apellido),
      nombre: sanitizeString(nombre),
      fecha_nacimiento: new Date(fecha_nacimiento),
      rol,
      email: sanitizeString(email),
      telefono: sanitizeString(telefono),
      id_cobertura: id_cobertura ? Number(id_cobertura) : null,
    };

    if (password && typeof password === "string" && password.trim() !== "") {
      const pwCheck = validatePassword(password);
      if (!pwCheck.valid) {
        return NextResponse.json({ codigo: -1, mensaje: pwCheck.error, payload: [] }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    await prisma.usuario.update({ where: { id: Number(id) }, data: updateData });

    return NextResponse.json({ codigo: 200, mensaje: "Usuario modificado", payload: [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}
