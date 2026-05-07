import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest, AuthError } from "@/lib/auth";
import { validatePassword } from "@/lib/validatePassword";
import { sanitizeString } from "@/lib/sanitize";
import { encrypt, decrypt, hmacHex } from "@/lib/crypto";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const jwtPayload = await validateRequest(req);
    const { id } = await params;
    const isAdmin = jwtPayload.rol === "Administrador";
    const isSelf = String(jwtPayload.id) === id;
    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    const usuario = await prisma.usuario.findUnique({
      where: { id: Number(id) },
      include: { cobertura: { select: { nombre: true } } },
    });

    if (!usuario) {
      return NextResponse.json({ codigo: -1, mensaje: "Usuario no encontrado", payload: [] });
    }

    const { password: _, cobertura, dni_hash: _h, ...rest } = usuario;
    return NextResponse.json({
      codigo: 200, mensaje: "OK",
      payload: [{
        ...rest,
        dni: decrypt(rest.dni) ?? "",
        telefono: decrypt(rest.telefono) ?? "",
        nombre_cobertura: cobertura?.nombre ?? null,
      }],
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const jwtPayload = await validateRequest(req);
    const { id } = await params;
    const isAdmin = jwtPayload.rol === "Administrador";
    const isOperador = jwtPayload.rol === "Operador";
    const isSelf = String(jwtPayload.id) === id;

    if (!isAdmin && !isOperador && !isSelf) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Operador solo puede editar pacientes, no a sí mismo ni a otros roles
    if (isOperador) {
      const target = await prisma.usuario.findUnique({ where: { id: Number(id) }, select: { rol: true } });
      if (!target || target.rol !== "Paciente") {
        return NextResponse.json({ error: "Operador solo puede editar pacientes" }, { status: 403 });
      }
    }

    const body = await req.json();
    const { dni, apellido, nombre, fecha_nacimiento, password, rol, email, telefono, id_cobertura, datos_verificados } = body;

    const dniRaw = sanitizeString(dni);
    const telefonoRaw = sanitizeString(telefono);

    const updateData: Record<string, unknown> = {
      dni: encrypt(dniRaw)!,
      dni_hash: hmacHex(dniRaw ?? ""),
      apellido: sanitizeString(apellido),
      nombre: sanitizeString(nombre),
      fecha_nacimiento: new Date(fecha_nacimiento),
      telefono: encrypt(telefonoRaw)!,
      id_cobertura: id_cobertura ? Number(id_cobertura) : null,
    };

    // Solo Admin puede cambiar email y rol
    if (isAdmin) {
      if (email) updateData.email = sanitizeString(email);
      if (rol) updateData.rol = rol;
    }

    // Admin u Operador pueden togglr datos_verificados
    if ((isAdmin || isOperador) && typeof datos_verificados === "boolean") {
      updateData.datos_verificados = datos_verificados;
    }

    // Si el paciente edita sus propios datos, resetear datos_verificados
    if (isSelf && !isAdmin && !isOperador) {
      updateData.datos_verificados = false;
    }

    if (password && typeof password === "string" && password.trim() !== "") {
      if (!isSelf && !isAdmin) {
        return NextResponse.json({ error: "No autorizado para cambiar contraseña" }, { status: 403 });
      }
      const pwCheck = validatePassword(password);
      if (!pwCheck.valid) {
        return NextResponse.json({ codigo: -1, mensaje: pwCheck.error, payload: [] }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    await prisma.usuario.update({ where: { id: Number(id) }, data: updateData });

    return NextResponse.json({ codigo: 200, mensaje: "Usuario modificado", payload: [] });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
