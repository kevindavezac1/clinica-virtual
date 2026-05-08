"use client";

import { useCallback, useEffect, useState, Fragment } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";

interface Turno {
  id_turno: number;
  hora: string;
  nombre_paciente: string;
  fecha_nacimiento: string;
  nota?: string;
  nota_medico?: string;
  fecha: string;
  estado: string;
  cobertura: string;
}

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getMonday(dateStr: string): Date {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(d: Date): string {
  return d.toLocaleDateString("en-CA");
}

function weekLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const m = monday.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
  const s = sunday.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  return `${m} – ${s}`;
}

function calcularEdad(fechaNac: string): number {
  const hoy = new Date();
  const nac = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

function estadoBadge(estado: string) {
  const map: Record<string, string> = {
    Pendiente: "badge-yellow",
    Confirmado: "badge-green",
    Cancelado: "badge-red",
    Realizado: "badge-teal",
    Ausente: "badge-orange",
  };
  return <span className={`badge ${map[estado] ?? "badge-gray"}`}>{estado}</span>;
}

function esPasado(fecha: string, hora: string): boolean {
  const dt = new Date(`${fecha.split("T")[0]}T${hora.padStart(5, "0")}:00-03:00`);
  return dt < new Date();
}

export default function TurnosProgramadosPage() {
  return (
    <ProtectedRoute allowedRole="Medico">
      <TurnosProgramados />
    </ProtectedRoute>
  );
}

function TurnosProgramados() {
  const { user, token } = useAuth();
  const [todayStr] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
  );
  const [fecha, setFecha] = useState(todayStr);
  const [weekStart, setWeekStart] = useState(() => getMonday(todayStr));
  const [counts, setCounts] = useState<Record<string, number | undefined>>({});
  const [closurePending, setClosurePending] = useState<Record<string, boolean>>({});
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [selected, setSelected] = useState<Turno | null>(null);
  const [loading, setLoading] = useState(false);
  const [cambiando, setCambiando] = useState<number | null>(null);
  const [editandoNota, setEditandoNota] = useState<number | null>(null);
  const [notaTexto, setNotaTexto] = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [mostrarCancelados, setMostrarCancelados] = useState(false);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const cargar = useCallback(async (f: string) => {
    if (!user) return;
    setLoading(true);
    const res = await fetch("/api/turnos/medico", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token! },
      body: JSON.stringify({ id_medico: user.id, fecha: f }),
    });
    const data = await res.json();
    if (data.payload) {
      const sorted = [...data.payload]
        .map((t: Turno) => ({ ...t, hora: t.hora.padStart(5, "0") }))
        .sort((a: Turno, b: Turno) =>
          new Date(`${a.fecha.split("T")[0]}T${a.hora}`).getTime() -
          new Date(`${b.fecha.split("T")[0]}T${b.hora}`).getTime()
        );
      setTurnos(sorted);
    }
    setLoading(false);
  }, [user, token]);

  const fetchWeekCounts = useCallback(async (monday: Date) => {
    if (!user) return;
    setCounts({});
    setClosurePending({});
    const now = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
    const results = await Promise.all(
      days.map(d =>
        fetch("/api/turnos/medico", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: token! },
          body: JSON.stringify({ id_medico: user.id, fecha: toDateStr(d) }),
        })
          .then(r => r.json())
          .then(data => {
            const payload: { fecha: string; hora: string; estado: string }[] = data.payload ?? [];
            const count = payload.filter(t => t.estado !== "Cancelado").length;
            const needsClosure = payload.some(t => {
              if (["Realizado", "Ausente", "Cancelado"].includes(t.estado)) return false;
              const dt = new Date(`${t.fecha.split("T")[0]}T${t.hora.padStart(5, "0")}:00-03:00`);
              return dt < now;
            });
            return { date: toDateStr(d), count, needsClosure };
          })
      )
    );
    const countMap: Record<string, number> = {};
    const closureMap: Record<string, boolean> = {};
    results.forEach(r => { countMap[r.date] = r.count; closureMap[r.date] = r.needsClosure; });
    setCounts(countMap);
    setClosurePending(closureMap);
  }, [user, token]);

  useEffect(() => { cargar(fecha); }, [fecha, cargar]);
  useEffect(() => { if (user) fetchWeekCounts(weekStart); }, [weekStart, user, fetchWeekCounts]);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
    setFecha(toDateStr(d));
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
    setFecha(toDateStr(d));
  };

  const abrirNota = (t: Turno) => {
    setEditandoNota(t.id_turno);
    setNotaTexto(t.nota_medico ?? "");
    setSelected(null);
  };

  const guardarNota = async (id: number) => {
    setGuardandoNota(true);
    await fetch(`/api/turnos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: token! },
      body: JSON.stringify({ nota_medico: notaTexto }),
    });
    setGuardandoNota(false);
    setEditandoNota(null);
    cargar(fecha);
  };

  const cambiarEstado = async (id: number, estado: string) => {
    setCambiando(id);
    await fetch(`/api/turnos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: token! },
      body: JSON.stringify({ estado }),
    });
    setCambiando(null);
    setSelected(null);
    cargar(fecha);
    fetchWeekCounts(weekStart);
  };

  const diaSeleccionado = weekDays.find(d => toDateStr(d) === fecha);
  const labelDia = diaSeleccionado
    ? diaSeleccionado.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
    : fecha;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="page-title">Turnos Programados</h1>

      {/* Week navigation */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={prevWeek} className="btn-secondary px-3 py-1.5 text-sm">← Anterior</button>
          <span className="font-medium text-slate-700 capitalize">{weekLabel(weekStart)}</span>
          <button onClick={nextWeek} className="btn-secondary px-3 py-1.5 text-sm">Siguiente →</button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((d, i) => {
            const ds = toDateStr(d);
            const isSelected = ds === fecha;
            const isToday = ds === todayStr;
            const count = counts[ds];
            const hasClosure = closurePending[ds];
            return (
              <button
                key={ds}
                onClick={() => setFecha(ds)}
                className={`relative rounded-xl p-2 text-center border transition-all ${
                  isSelected
                    ? "bg-brand-700 text-white border-brand-700 shadow-sm"
                    : hasClosure
                      ? "bg-amber-50 border-amber-400 text-amber-800 hover:bg-amber-100"
                      : isToday
                        ? "bg-brand-50 border-brand-200 text-brand-700"
                        : "bg-white border-slate-200 text-slate-600 hover:border-brand-200 hover:bg-slate-50"
                }`}
              >
                {hasClosure && !isSelected && (
                  <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
                <p className="text-xs font-medium">{DIAS[i]}</p>
                <p className="text-lg font-bold leading-none mt-0.5">{d.getDate()}</p>
                {count === undefined ? (
                  <p className="text-xs mt-1 opacity-40">…</p>
                ) : count > 0 ? (
                  <p className={`text-xs mt-1 font-medium ${isSelected ? "text-white/80" : hasClosure ? "text-amber-700" : "text-brand-600"}`}>
                    {count} {count === 1 ? "turno" : "turnos"}
                  </p>
                ) : (
                  <p className={`text-xs mt-1 ${isSelected ? "text-brand-300" : "text-slate-300"}`}>libre</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day detail */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-500 capitalize">{labelDia}</p>
        <label className="flex items-center gap-1.5 text-sm text-slate-500 cursor-pointer">
          <input
            type="checkbox"
            checked={mostrarCancelados}
            onChange={e => setMostrarCancelados(e.target.checked)}
            className="rounded"
          />
          Ver cancelados
        </label>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-6 text-slate-400">
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Cargando...</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-header rounded-tl-xl">Hora</th>
                <th className="table-header">Paciente</th>
                <th className="table-header">Edad</th>
                <th className="table-header">Estado</th>
                <th className="table-header rounded-tr-xl">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {turnos.filter(t => mostrarCancelados || t.estado !== "Cancelado").length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">No hay turnos para esta fecha</td></tr>
              ) : turnos.filter(t => mostrarCancelados || t.estado !== "Cancelado").map(t => {
                const pasado = esPasado(t.fecha, t.hora);
                const cerrado = ["Realizado", "Ausente", "Cancelado"].includes(t.estado);
                const requiereAccion = pasado && !cerrado;
                const rowClass = requiereAccion
                  ? "bg-amber-50 hover:bg-amber-100 transition-colors"
                  : cerrado && pasado
                    ? "opacity-60 hover:opacity-100 transition-opacity"
                    : "hover:bg-slate-50 transition-colors";
                return (
                  <Fragment key={t.id_turno}>
                    <tr className={rowClass}>
                      <td className="table-cell font-mono">{t.hora}</td>
                      <td className="table-cell">{t.nombre_paciente}</td>
                      <td className="table-cell">{calcularEdad(t.fecha_nacimiento)}</td>
                      <td className="table-cell">
                        <div className="flex flex-col gap-0.5 items-start">
                          {estadoBadge(t.estado ?? "Pendiente")}
                          {requiereAccion && <span className="text-[10px] text-amber-600 font-medium">Requiere cierre</span>}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex gap-2 items-center flex-wrap">
                          <button
                            onClick={() => setSelected(selected?.id_turno === t.id_turno ? null : t)}
                            className="text-brand-700 hover:text-brand-900 text-xs font-medium transition-colors"
                          >
                            {selected?.id_turno === t.id_turno ? "Ocultar" : "Ver notas"}
                          </button>
                          <button
                            onClick={() => abrirNota(t)}
                            className="text-brand-700 hover:text-brand-900 text-xs font-medium transition-colors"
                          >
                            {t.nota_medico ? "Editar nota" : "Agregar nota"}
                          </button>
                          {pasado && !cerrado && (
                            <>
                              <button
                                onClick={() => cambiarEstado(t.id_turno, "Realizado")}
                                disabled={cambiando === t.id_turno}
                                className="text-xs text-teal-700 font-medium hover:underline disabled:opacity-50"
                              >
                                Realizado
                              </button>
                              <button
                                onClick={() => cambiarEstado(t.id_turno, "Ausente")}
                                disabled={cambiando === t.id_turno}
                                className="text-xs text-orange-600 font-medium hover:underline disabled:opacity-50"
                              >
                                Ausente
                              </button>
                            </>
                          )}
                          {!pasado && t.estado !== "Cancelado" && (
                            <button
                              onClick={() => cambiarEstado(t.id_turno, "Cancelado")}
                              disabled={cambiando === t.id_turno}
                              className="text-xs text-red-600 font-medium hover:underline disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {selected?.id_turno === t.id_turno && (
                      <tr>
                        <td colSpan={5} className="px-4 py-3 bg-brand-50 text-sm text-slate-700 border-b border-slate-100">
                          <p><strong>Cobertura:</strong> {t.cobertura}</p>
                          <p><strong>Motivo de consulta:</strong> {t.nota || "Sin notas del paciente."}</p>
                          {t.nota_medico && (
                            <p className="mt-1"><strong>Nota clínica:</strong> {t.nota_medico}</p>
                          )}
                        </td>
                      </tr>
                    )}
                    {editandoNota === t.id_turno && (
                      <tr>
                        <td colSpan={5} className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                          <p className="text-xs font-semibold text-brand-700 mb-2">Nota clínica — {t.nombre_paciente}</p>
                          <textarea
                            className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
                            rows={4}
                            placeholder="Diagnóstico, indicaciones, observaciones..."
                            value={notaTexto}
                            onChange={e => setNotaTexto(e.target.value)}
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => guardarNota(t.id_turno)}
                              disabled={guardandoNota}
                              className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50"
                            >
                              {guardandoNota ? "Guardando..." : "Guardar nota"}
                            </button>
                            <button
                              onClick={() => setEditandoNota(null)}
                              className="btn-secondary text-xs px-4 py-1.5"
                            >
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Link href="/" className="btn-secondary mt-6 inline-block">← Volver al inicio</Link>
    </div>
  );
}
