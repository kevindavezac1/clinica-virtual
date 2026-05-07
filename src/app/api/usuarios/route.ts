import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest, AuthError, generateResetToken } from "@/lib/auth";
import { validatePassword } from "@/lib/validatePassword";
import { sanitizeString, sanitizeEmail } from "@/lib/sanitize";
import { encrypt, decrypt, hmacHex } from "@/lib/crypto";
import { sendEmailVerification } from "@/lib/email";
import bcrypt from "bcryptjs";

const ROLES_VALIDOS = ["Paciente", "Medico", "Operador", "Administrador"];

function decryptUsuario<T extends { dni: string; telefono: string; dni_hash?: string | null }>(u: T) {
  return { ...u, dni: decrypt(u.dni) ?? "", telefono: decrypt(u.telefono) ?? "" };
}

export async function GET(req: NextRequest) {
  try {
    const jwtPayload = await validateRequest(req);
    if (jwtPayload.rol === "Paciente") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    const rol = req.nextUrl.searchParams.get("rol") ?? "";
    const limit = Number(req.nextUrl.searchParams.get("limit")) || undefined;

    const where: Record<string, unknown> = {};
    if (rol) where.rol = rol;
    if (q) {
      where.OR = [
        { nombre: { contains: q, mode: "insensitive" } },
        { apellido: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { dni_hash: hmacHex(q) },
      ];
    }

    const usuarios = await prisma.usuario.findMany({
      where,
      include: { cobertura: { select: { nombre: true } } },
      ...(limit ? { take: limit } : {}),
    });

    const payload = usuarios.map(({ cobertura, password: _pw, dni_hash: _h, ...u }) => ({
      ...decryptUsuario(u),
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
    let callerRol: string | null = null;
    try {
      const jwtPayload = await validateRequest(req);
      callerRol = jwtPayload.rol as string;
    } catch {
      // Unauthenticated — only Paciente allowed below
    }

    const body = await req.json();
    const dniRaw = sanitizeString(body.dni, 20);
    const apellido = sanitizeString(body.apellido, 100);
    const nombre = sanitizeString(body.nombre, 100);
    const email = sanitizeEmail(body.email);
    const telefonoRaw = sanitizeString(body.telefono, 20);
    const { fecha_nacimiento, password, id_cobertura, id_especialidad } = body;

    const createdByStaff = callerRol === "Administrador" || callerRol === "Operador";
    const rol: string = callerRol === "Administrador" ? (body.rol ?? "Paciente") : "Paciente";

    if (!dniRaw || !apellido || !nombre || !email) {
      return NextResponse.json({ error: "Faltan campos requeridos o email inválido" }, { status: 400 });
    }

    if (!ROLES_VALIDOS.includes(rol)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    const pwCheck = validatePassword(password ?? "");
    if (!pwCheck.valid) {
      return NextResponse.json({ error: pwCheck.error }, { status: 400 });
    }

    const dniHash = hmacHex(dniRaw);
    const existente = await prisma.usuario.findFirst({ where: { dni_hash: dniHash } });
    if (existente) {
      return NextResponse.json({ error: "Ya existe un usuario registrado con ese DNI" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const emailExistente = await prisma.usuario.findFirst({ where: { email } });
    if (emailExistente) {
      return NextResponse.json({ error: "Ya existe un usuario registrado con ese email" }, { status: 400 });
    }

    const usuario = await prisma.$transaction(async (tx) => {
      const u = await tx.usuario.create({
        data: {
          dni: encrypt(dniRaw)!,
          dni_hash: dniHash,
          apellido,
          nombre,
          fecha_nacimiento: new Date(fecha_nacimiento),
          password: hashedPassword,
          rol,
          email,
          telefono: encrypt(telefonoRaw)!,
          id_cobertura: id_cobertura ? Number(id_cobertura) : null,
          email_verificado: createdByStaff,
        },
      });
      if (rol === "Medico" && id_especialidad) {
        await tx.medicoEspecialidad.create({
          data: { id_medico: u.id, id_especialidad: Number(id_especialidad) },
        });
      }
      if (!createdByStaff) {
        const token = generateResetToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await tx.emailVerificationToken.create({
          data: { token, id_usuario: u.id, expires_at: expiresAt },
        });
        return { user: u, verificationToken: token };
      }
      return { user: u, verificationToken: null };
    });

    if (usuario.verificationToken) {
      await sendEmailVerification(email, `${nombre} ${apellido}`, usuario.verificationToken);
    }

    return NextResponse.json({ codigo: 200, mensaje: "Usuario añadido", payload: [{ id_usuario: usuario.user.id }] });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
