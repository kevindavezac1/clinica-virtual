import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest, AuthError } from "@/lib/auth";
import { validatePassword } from "@/lib/validatePassword";
import { sanitizeString, sanitizeEmail } from "@/lib/sanitize";
import bcrypt from "bcryptjs";

const ROLES_VALIDOS = ["Paciente", "Medico", "Operador", "Admin"];

export async function GET(req: NextRequest) {
  try {
    await validateRequest(req);
    const usuarios = await prisma.usuario.findMany({
      include: { cobertura: { select: { nombre: true } } },
    });
    const payload = usuarios.map(({ cobertura, password: _pw, ...u }) => ({
      ...u,
      nombre_cobertura: cobertura?.nombre ?? null,
    }));
    return NextResponse.json({ codigo: 200, mensaje: "OK", payload });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Try to get auth — optional (public registration allowed for Paciente only)
    let callerRol: string | null = null;
    try {
      const jwtPayload = await validateRequest(req);
      callerRol = jwtPayload.rol as string;
    } catch {
      // Unauthenticated — only Paciente allowed below
    }

    const body = await req.json();
    const dni = sanitizeString(body.dni, 20);
    const apellido = sanitizeString(body.apellido, 100);
    const nombre = sanitizeString(body.nombre, 100);
    const email = sanitizeEmail(body.email);
    const telefono = sanitizeString(body.telefono, 20);
    const { fecha_nacimiento, password, id_cobertura, id_especialidad } = body;

    // Unauthenticated → force Paciente; authenticated admin → any role
    const rol: string = callerRol === "Admin" ? (body.rol ?? "Paciente") : "Paciente";

    if (!dni || !apellido || !nombre || !email) {
      return NextResponse.json({ error: "Faltan campos requeridos o email inválido" }, { status: 400 });
    }

    if (!ROLES_VALIDOS.includes(rol)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    const pwCheck = validatePassword(password ?? "");
    if (!pwCheck.valid) {
      return NextResponse.json({ error: pwCheck.error }, { status: 400 });
    }

    const existente = await prisma.usuario.findFirst({ where: { dni } });
    if (existente) {
      return NextResponse.json({ error: "Ya existe un usuario registrado con ese DNI" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const usuario = await prisma.$transaction(async (tx) => {
      const u = await tx.usuario.create({
        data: {
          dni, apellido, nombre,
          fecha_nacimiento: new Date(fecha_nacimiento),
          password: hashedPassword,
          rol, email, telefono,
          id_cobertura: id_cobertura ? Number(id_cobertura) : null,
        },
      });
      if (rol === "Medico" && id_especialidad) {
        await tx.medicoEspecialidad.create({
          data: { id_medico: u.id, id_especialidad: Number(id_especialidad) },
        });
      }
      return u;
    });

    return NextResponse.json({ codigo: 200, mensaje: "Usuario añadido", payload: [{ id_usuario: usuario.id }] });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
