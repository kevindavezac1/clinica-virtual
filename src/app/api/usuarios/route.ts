import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";
import { validatePassword } from "@/lib/validatePassword";
import { sanitizeString } from "@/lib/sanitize";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    await validateRequest(req);
    const usuarios = await prisma.usuario.findMany({
      include: { cobertura: { select: { nombre: true } } },
    });
    const payload = usuarios.map(({ cobertura, ...u }) => ({
      ...u,
      nombre_cobertura: cobertura?.nombre ?? null,
    }));
    return NextResponse.json({ codigo: 200, mensaje: "OK", payload });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const dni = sanitizeString(body.dni);
    const apellido = sanitizeString(body.apellido);
    const nombre = sanitizeString(body.nombre);
    const email = sanitizeString(body.email);
    const telefono = sanitizeString(body.telefono);
    const { fecha_nacimiento, password, rol, id_cobertura, id_especialidad } = body;

    const pwCheck = validatePassword(password ?? "");
    if (!pwCheck.valid) {
      return NextResponse.json({ error: pwCheck.error }, { status: 400 });
    }

    const existente = await prisma.usuario.findFirst({ where: { dni } });
    if (existente) {
      return NextResponse.json({ error: "Ya existe un usuario registrado con ese DNI" }, { status: 400 });
    }

    const usuario = await prisma.usuario.create({
      data: {
        dni, apellido, nombre,
        fecha_nacimiento: new Date(fecha_nacimiento),
        password: await bcrypt.hash(password, 10),
        rol, email, telefono,
        id_cobertura: id_cobertura ? Number(id_cobertura) : null,
      },
    });

    if (rol === "Medico" && id_especialidad) {
      await prisma.medicoEspecialidad.create({
        data: { id_medico: usuario.id, id_especialidad },
      });
    }

    return NextResponse.json({ codigo: 200, mensaje: "Usuario añadido", payload: [{ id_usuario: usuario.id }] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
