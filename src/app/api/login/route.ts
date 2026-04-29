import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { usuario, password } = await req.json();
    const user = await prisma.usuario.findFirst({
      where: { dni: usuario },
      select: { id: true, nombre: true, apellido: true, rol: true, password: true },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ codigo: -1, mensaje: "Usuario o contraseña incorrecta", payload: [] });
    }

    const { password: _, ...userSafe } = user;

    const token = await signToken({ sub: userSafe.id, id: userSafe.id, name: userSafe.nombre, rol: userSafe.rol });
    return NextResponse.json({ codigo: 200, mensaje: "OK", payload: userSafe, jwt: token });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
