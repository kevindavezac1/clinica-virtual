import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest, AuthError } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const jwtPayload = await validateRequest(req);
    const { id } = await params;
    if (jwtPayload.rol === "Paciente" && Number(jwtPayload.id) !== Number(id)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    if (jwtPayload.rol !== "Paciente" && jwtPayload.rol !== "Medico" && jwtPayload.rol !== "Operador" && jwtPayload.rol !== "Administrador") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    const usuario = await prisma.usuario.findUnique({
      where: { id: Number(id) },
      include: { cobertura: { select: { id: true, nombre: true } } },
    });

    if (!usuario?.cobertura) {
      return NextResponse.json({ codigo: 404, mensaje: "Cobertura no encontrada para el usuario" }, { status: 404 });
    }

    return NextResponse.json({ codigo: 200, payload: usuario.cobertura, mensaje: "Cobertura obtenida exitosamente" });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
