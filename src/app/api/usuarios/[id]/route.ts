import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest, AuthError } from "@/lib/auth";
import { validatePassword } from "@/lib/validatePassword";
import { sanitizeString, sanitizeEmail } from "@/lib/sanitize";
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

    if (isOperador) {
      const target = await prisma.usuario.findUnique({ where: { id: Number(id) }, select: { rol: true } });
      if (!target || target.rol !== "Paciente") {
        return NextResponse.json({ error: "Operador solo puede editar pacientes" }, { status: 403 });
      }
    }

    const body = await req.json();
    const { dni, apellido, nombre, fecha_nacimiento, password, current_password, rol, email, telefono, id_cobertura, datos_verificados } = body;

    const telefonoRaw = sanitizeString(telefono, 20);
    if (telefonoRaw && !/^\d{10}$/.test(telefonoRaw)) {
      return NextResponse.json({ codigo: -1, mensaje: "Teléfono inválido: ingresá 10 dígitos sin 0 ni 15 (ej: 3496502690)", payload: [] }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (isAdmin) {
      const dniRaw = sanitizeString(dni, 20);
      if (dniRaw) { updateData.dni = encrypt(dniRaw)!; updateData.dni_hash = hmacHex(dniRaw); }
      if (apellido) updateData.apellido = sanitizeString(apellido, 100);
      if (nombre) updateData.nombre = sanitizeString(nombre, 100);
      if (fecha_nacimiento) updateData.fecha_nacimiento = new Date(fecha_nacimiento);
      if (telefonoRaw) updateData.telefono = encrypt(telefonoRaw)!;
      if (id_cobertura !== undefined) updateData.id_cobertura = id_cobertura ? Number(id_cobertura) : null;
      const emailClean = sanitizeEmail(email);
      if (emailClean) updateData.email = emailClean;
      if (rol) updateData.rol = rol;
      if (typeof datos_verificados === "boolean") updateData.datos_verificados = datos_verificados;
    } else if (isOperador) {
      // Operador edita datos del paciente incluyendo email — es quien atiende en mostrador
      const dniRaw = sanitizeString(dni, 20);
      if (dniRaw) { updateData.dni = encrypt(dniRaw)!; updateData.dni_hash = hmacHex(dniRaw); }
      if (apellido) updateData.apellido = sanitizeString(apellido, 100);
      if (nombre) updateData.nombre = sanitizeString(nombre, 100);
      if (fecha_nacimiento) updateData.fecha_nacimiento = new Date(fecha_nacimiento);
      if (telefonoRaw) updateData.telefono = encrypt(telefonoRaw)!;
      if (id_cobertura !== undefined) updateData.id_cobertura = id_cobertura ? Number(id_cobertura) : null;
      if (typeof datos_verificados === "boolean") updateData.datos_verificados = datos_verificados;
      const emailClean = sanitizeEmail(email);
      if (emailClean) updateData.email = emailClean;
    } else {
      // isSelf (Paciente/Médico): solo teléfono y cobertura (si es paciente)
      if (telefonoRaw) updateData.telefono = encrypt(telefonoRaw)!;
      if (jwtPayload.rol === "Paciente" && id_cobertura !== undefined) {
        updateData.id_cobertura = id_cobertura ? Number(id_cobertura) : null;
      }
      // Cualquier auto-edición resetea la verificación de datos
      updateData.datos_verificados = false;
    }

    // Cambio de contraseña — isSelf debe confirmar con contraseña actual
    if (password && typeof password === "string" && password.trim() !== "") {
      if (!isSelf && !isAdmin) {
        return NextResponse.json({ error: "No autorizado para cambiar contraseña" }, { status: 403 });
      }
      if (isSelf && !isAdmin) {
        if (!current_password) {
          return NextResponse.json({ codigo: -1, mensaje: "Ingresá tu contraseña actual para poder cambiarla", payload: [] }, { status: 400 });
        }
        const dbUser = await prisma.usuario.findUnique({ where: { id: Number(id) }, select: { password: true } });
        if (!dbUser || !(await bcrypt.compare(current_password, dbUser.password))) {
          return NextResponse.json({ codigo: -1, mensaje: "Contraseña actual incorrecta", payload: [] }, { status: 400 });
        }
      }
      const pwCheck = validatePassword(password);
      if (!pwCheck.valid) {
        return NextResponse.json({ codigo: -1, mensaje: pwCheck.error, payload: [] }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ codigo: 200, mensaje: "Sin cambios", payload: [] });
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
