"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Turno {
  id_turno: number;
  hora: string;
  estado: string;
  nota?: string;
  nombre_paciente: string;
  nombre_medico: string;
  especialidad: string;
  cobertura: string;
}

interface MedicoOption {
  id: number;
  nombre: string;
  apellido: string;
}

interface EspecialidadOption {
  id: number;
  descripcion: string;
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

export default function VerAgendaOperadorPage() {
  return (
    <ProtectedRoute allowedRole="Operador">
      <VerAgendaOperador />
    </ProtectedRoute>
  );
}

function VerAgendaOperador() {
  const { token } = useAuth();
  const [todayStr] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
  );
  const [fecha, setFecha] = useState(todayStr);
  const [weekStart, setWeekStart] = useState(() => getMonday(todayStr));
  const [counts, setCounts] = useState<Record<string, number | undefined>>({});
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros globales (afectan semana + tabla)
  const [filtroMedicoId, setFiltroMedicoId] = useState<string>("");
  const [filtroEspecialidadId, setFiltroEspecialidadId] = useState<string>("");
  const [listaMedicos, setListaMedicos] = useState<MedicoOption[]>([]);
  const [listaEspecialidades, setListaEspecialidades] = useState<EspecialidadOption[]>([]);

  // Filtros locales (solo afectan tabla del día)
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [mostrarCancelados, setMostrarCancelados] = useState(false);

  const [cancelando, setCancelando] = useState<number | null>(null);
  const [confirmando, setConfirmando] = useState<number | null>(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  // Fetch listas de médicos y especialidades al montar
  useEffect(() => {
    fetch("/api/especialidades", { headers: { Authorization: token! } })
      .then(r => r.json())
      .then(d => setListaEspecialidades(d.payload ?? []));
    fetch("/api/usuarios?rol=Medico", { headers: { Authorization: token! } })
      .then(r => r.json())
      .then(d => setListaMedicos((d.payload ?? []).sort((a: MedicoOption, b: MedicoOption) =>
        a.apellido.localeCompare(b.apellido)
      )));
  }, [token]);

  // Cuando cambia filtro global → limpiar filtros locales de la tabla
  useEffect(() => {
    setBusqueda("");
    setFiltroEstado("");
    setMostrarCancelados(false);
  }, [filtroMedicoId, filtroEspecialidadId]);

  const buildParams = useCallback((f: string) => {
    const params = new URLSearchParams({ fecha: f });
    if (filtroMedicoId) params.set("id_medico", filtroMedicoId);
    if (filtroEspecialidadId) params.set("id_especialidad", filtroEspecialidadId);
    return params.toString();
  }, [filtroMedicoId, filtroEspecialidadId]);

  const cargar = useCallback(async (f: string) => {
    setLoading(true);
    setTurnos([]);
    const res = await fetch(`/api/turnos?${buildParams(f)}`, {
      headers: { Authorization: token! },
    }).then(r => r.json());
    if (res.payload) {
      const data: Turno[] = res.payload.map((t: Turno) => ({ ...t, hora: t.hora.padStart(5, "0") }));
      setTurnos(data);
    }
    setLoading(false);
  }, [token, buildParams]);

  const fetchWeekCounts = useCallback(async (monday: Date) => {
    setCounts({});
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
    const results = await Promise.all(
      days.map(d =>
        fetch(`/api/turnos?${buildParams(toDateStr(d))}`, { headers: { Authorization: token! } })
          .then(r => r.json())
          .then(data => ({
            date: toDateStr(d),
            count: (data.payload?.filter((t: { estado: string }) => t.estado !== "Cancelado").length ?? 0) as number,
          }))
      )
    );
    const map: Record<string, number> = {};
    results.forEach(r => { map[r.date] = r.count; });
    setCounts(map);
  }, [token, buildParams]);

  useEffect(() => { cargar(fecha); }, [fecha, cargar]);
  useEffect(() => { fetchWeekCounts(weekStart); }, [weekStart, fetchWeekCounts]);

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

  const filtrados = turnos.filter(t => {
    if (!mostrarCancelados && t.estado === "Cancelado") return false;
    const q = busqueda.toLowerCase();
    const coincideBusqueda = !q ||
      t.nombre_paciente.toLowerCase().includes(q) ||
      t.nombre_medico.toLowerCase().includes(q) ||
      t.especialidad.toLowerCase().includes(q);
    return coincideBusqueda && (!filtroEstado || t.estado === filtroEstado);
  });

  const cambiarEstado = async (id: number, estado: string) => {
    if (estado === "Cancelado" && !confirm("¿Cancelar este turno?")) return;
    estado === "Cancelado" ? setCancelando(id) : setConfirmando(id);
    await fetch(`/api/turnos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: token! },
      body: JSON.stringify({ estado }),
    });
    setCancelando(null);
    setConfirmando(null);
    cargar(fecha);
    fetchWeekCounts(weekStart);
  };

  const limpiarFiltros = () => {
    setFiltroMedicoId("");
    setFiltroEspecialidadId("");
    setBusqueda("");
    setFiltroEstado("");
    setMostrarCancelados(false);
  };
  const hayFiltros = filtroMedicoId || filtroEspecialidadId || busqueda || filtroEstado || mostrarCancelados;

  const diaSeleccionado = weekDays.find(d => toDateStr(d) === fecha);
  const labelDia = diaSeleccionado
    ? diaSeleccionado.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
    : fecha;

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="page-title">Gestión de Turnos</h1>

      {/* Filtros globales */}
      <div className="card mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label-field">Médico</label>
          <select
            className="select-field min-w-[200px]"
            value={filtroMedicoId}
            onChange={e => setFiltroMedicoId(e.target.value)}
          >
            <option value="">Todos los médicos</option>
            {listaMedicos.map(m => (
              <option key={m.id} value={m.id}>{m.apellido}, {m.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-field">Especialidad</label>
          <select
            className="select-field min-w-[180px]"
            value={filtroEspecialidadId}
            onChange={e => setFiltroEspecialidadId(e.target.value)}
          >
            <option value="">Todas las especialidades</option>
            {listaEspecialidades.map(e => (
              <option key={e.id} value={e.id}>{e.descripcion}</option>
            ))}
          </select>
        </div>
        {hayFiltros && (
          <button onClick={limpiarFiltros} className="btn-secondary">Limpiar filtros</button>
        )}
      </div>

      {/* Navegación semanal */}
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
            return (
              <button
                key={ds}
                onClick={() => setFecha(ds)}
                className={`rounded-xl p-2 text-center border transition-all ${
                  isSelected
                    ? "bg-brand-700 text-white border-brand-700 shadow-sm"
                    : isToday
                      ? "bg-brand-50 border-brand-200 text-brand-700"
                      : "bg-white border-slate-200 text-slate-600 hover:border-brand-200 hover:bg-slate-50"
                }`}
              >
                <p className="text-xs font-medium">{DIAS[i]}</p>
                <p className="text-lg font-bold leading-none mt-0.5">{d.getDate()}</p>
                {count === undefined ? (
                  <p className="text-xs mt-1 opacity-40">…</p>
                ) : count > 0 ? (
                  <p className={`text-xs mt-1 font-medium ${isSelected ? "text-white/80" : "text-brand-600"}`}>
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

      {/* Búsqueda y estado dentro del día */}
      <div className="card mb-5 flex flex-wrap gap-3 items-center">
        <span className="text-sm font-medium text-slate-500 capitalize">{labelDia}</span>
        <input
          className="input-field flex-1 min-w-[200px]"
          placeholder="Buscar paciente, médico o especialidad..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <select className="select-field max-w-[180px]" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {["Pendiente", "Confirmado", "Realizado", "Ausente", ...(mostrarCancelados ? ["Cancelado"] : [])].map(e => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-slate-500 cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={mostrarCancelados}
            onChange={e => { setMostrarCancelados(e.target.checked); setFiltroEstado(""); }}
            className="rounded"
          />
          Ver cancelados
        </label>
        <span className="text-sm text-slate-400 whitespace-nowrap">{filtrados.length} turno{filtrados.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-8 text-slate-400">
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
                <th className="table-header">Hora</th>
                <th className="table-header">Médico</th>
                <th className="table-header">Especialidad</th>
                <th className="table-header">Paciente</th>
                <th className="table-header">Cobertura</th>
                <th className="table-header">Estado</th>
                <th className="table-header rounded-tr-xl">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-slate-400">No hay turnos para esta fecha</td></tr>
              ) : filtrados.map(t => (
                <tr key={t.id_turno} className="hover:bg-slate-50 transition-colors">
                  <td className="table-cell font-mono">{t.hora}</td>
                  <td className="table-cell">{t.nombre_medico}</td>
                  <td className="table-cell">{t.especialidad}</td>
                  <td className="table-cell">{t.nombre_paciente}</td>
                  <td className="table-cell">{t.cobertura}</td>
                  <td className="table-cell">{estadoBadge(t.estado)}</td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      {t.estado === "Pendiente" && (
                        <button
                          onClick={() => cambiarEstado(t.id_turno, "Confirmado")}
                          disabled={confirmando === t.id_turno}
                          className="text-xs text-green-700 font-medium hover:underline disabled:opacity-50"
                        >
                          {confirmando === t.id_turno ? "..." : "Confirmar"}
                        </button>
                      )}
                      {t.estado !== "Cancelado" && t.estado !== "Realizado" && t.estado !== "Ausente" && (
                        <button
                          onClick={() => cambiarEstado(t.id_turno, "Cancelado")}
                          disabled={cancelando === t.id_turno}
                          className="text-xs text-red-600 font-medium hover:underline disabled:opacity-50"
                        >
                          {cancelando === t.id_turno ? "..." : "Cancelar"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
