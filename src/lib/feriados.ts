import { prisma } from "./prisma";

interface NagerHoliday {
  date: string;
  localName: string;
}

async function fetchNagerHolidays(year: number): Promise<NagerHoliday[]> {
  try {
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/AR`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function getFeriadosForYears(years: number[]) {
  const [nagerResults, localFeriados] = await Promise.all([
    Promise.all(years.map(y => fetchNagerHolidays(y))),
    prisma.feriado.findMany({ orderBy: { fecha: "asc" } }),
  ]);

  const nagerAll = nagerResults.flat();
  const nagerFechas = new Set(nagerAll.map(h => h.date));

  const nagerMapped = nagerAll.map(h => ({
    id: null as number | null,
    fecha: h.date,
    descripcion: h.localName,
    fuente: "nacional" as const,
  }));

  const localMapped = localFeriados
    .map(f => ({
      id: f.id,
      fecha: f.fecha.toISOString().split("T")[0],
      descripcion: f.descripcion,
      fuente: "local" as const,
    }))
    .filter(f => !nagerFechas.has(f.fecha));

  return [...nagerMapped, ...localMapped].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export async function isFeriado(fecha: string): Promise<{ es: boolean; descripcion?: string }> {
  const year = parseInt(fecha.split("-")[0]);
  const [nager, local] = await Promise.all([
    fetchNagerHolidays(year),
    prisma.feriado.findUnique({ where: { fecha: new Date(fecha) } }),
  ]);

  const match = nager.find(h => h.date === fecha);
  if (match) return { es: true, descripcion: match.localName };
  if (local) return { es: true, descripcion: local.descripcion };
  return { es: false };
}
