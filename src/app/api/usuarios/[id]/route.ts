import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest, AuthError } from "@/lib/auth";
import { validatePassword } from "@/lib/validatePassword";
import { sanitizeString } from "@/lib/sanitize";
import { encrypt, decrypt, hmacHex } from "@/lib/crypto";
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
    const isAdmin = jwtPayload.rol === "Admin";
    const isSelf = String(jwtPayload.id) === id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const { dni, apellido, nombre, fecha_nacimiento, password, rol, email, telefono, id_cobertura } = body;

    const dniRaw = sanitizeString(dni);
    const telefonoRaw = sanitizeString(telefono);

    const updateData: Record<string, unknown> = {
      dni: encrypt(dniRaw)!,
      dni_hash: hmacHex(dniRaw ?? ""),
      apellido: sanitizeString(apellido),
      nombre: sanitizeString(nombre),
      fecha_nacimiento: new Date(fecha_nacimiento),
      email: sanitizeString(email),
      telefono: encrypt(telefonoRaw)!,
      id_cobertura: id_cobertura ? Number(id_cobertura) : null,
    };

    if (isAdmin && rol) {
      updateData.rol = rol;
    }

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
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
