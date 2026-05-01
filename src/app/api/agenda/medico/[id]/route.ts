import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await validateRequest(req);
    const { id } = await params;
    const rows = await prisma.agenda.findMany({ where: { id_medico: Number(id) } });

    if (rows.length > 0) {
      return NextResponse.json({ codigo: 200, mensaje: "OK", payload: rows });
    }
    return NextResponse.json({ codigo: 200, mensaje: "Médico no posee agenda", payload: [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: (error as { status?: number }).status ?? 500 });
  }
}
