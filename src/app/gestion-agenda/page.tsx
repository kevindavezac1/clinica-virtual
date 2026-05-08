"use client";
import { toast } from "@/lib/toast";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ConfirmDialog from "@/components/ConfirmDialog";
import Link from "next/link";

// Horarios de la clínica — límites duros
const CLINICA = {
  semana: { apertura: "08:00", cierre: "20:00" },
  sabado: { apertura: "08:00", cierre: "13:00" },
};

const HORAS = Array.from({ length: 25 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
}); // 08:00 … 20:00

const DIAS = [
  { key: 1, label: "Lun" },
  { key: 2, label: "Mar" },
  { key: 3, label: "Mié" },
  { key: 4, label: "Jue" },
  { key: 5, label: "Vie" },
  { key: 6, label: "Sáb" },
];

const DURACIONES = [15, 20, 30, 45, 60];

interface AgendaEntry { id: number; fecha: string; hora_entrada: string; hora_salida: string; duracion: number; turnosActivos: number; }

export default function GestionAgendaPage() {
  return (
    <ProtectedRoute allowedRole="Medico">
      <GestionAgenda />
    </ProtectedRoute>
  );
}

function GestionAgenda() {
  const { user, token } = useAuth();
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });

  const [idEspecialidad, setIdEspecialidad] = useState<number>(1);
  const [duracion, setDuracion] = useState<number>(30);
  const [modo, setModo] = useState<"rango" | "dia">("rango");

  // Vista mensual
  const [mesVista, setMesVista] = useState(hoy.slice(0, 7));
  const [agendaMes, setAgendaMes] = useState<AgendaEntry[]>([]);
  const [todasAgendas, setTodasAgendas] = useState<AgendaEntry[]>([]);
  const [loadingMes, setLoadingMes] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; turnosActivos: number } | null>(null);

  // Formulario carga semanal
  const [diasSel, setDiasSel] = useState<number[]>([1, 2, 3, 4, 5]);
  const [rEntrada, setREntrada] = useState("");
  const [rSalida, setRSalida] = useState("");
  const [rDesde, setRDesde] = useState(hoy);
  const [rHasta, setRHasta] = useState("");
  const [preview, setPreview] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  // Formulario día específico
  const [dFecha, setDFecha] = useState(hoy);
  const [dEntrada, setDEntrada] = useState("");
  const [dSalida, setDSalida] = useState("");

  // Carga de especialidad
  useEffect(() => {
    if (!user) return;
    fetch(`/api/medico-especialidad/medico/${user.id}`, { headers: { Authorization: token! } })
      .then(r => r.json())
      .then(d => { if (d.payload?.length > 0) setIdEspecialidad(d.payload[0].id_especialidad); });
  }, [user]);

  // Carga agenda del mes
  const cargarMes = async () => {
    if (!user) return;
    setLoadingMes(true);
    const res = await fetch(`/api/agenda/medico/${user.id}`, { headers: { Authorization: token! } }).then(r => r.json());
    const todas = (res.payload || []) as AgendaEntry[];
    setTodasAgendas(todas);
    setAgendaMes(todas.filter(a => a.fecha.slice(0, 7) === mesVista).sort((a, b) => a.fecha.localeCompare(b.fecha)));
    setLoadingMes(false);
  };

  useEffect(() => { if (user) cargarMes(); }, [user]);

  useEffect(() => {
    setAgendaMes(todasAgendas.filter(a => a.fecha.slice(0, 7) === mesVista).sort((a, b) => a.fecha.localeCompare(b.fecha)));
  }, [mesVista, todasAgendas]);

  // Preview de fechas a generar
  useEffect(() => {
    if (!rDesde || !rHasta || diasSel.length === 0) { setPreview([]); return; }
    const dates: string[] = [];
    const cur = new Date(rDesde + "T12:00:00Z");
    const end = new Date(rHasta + "T12:00:00Z");
    while (cur <= end) {
      if (diasSel.includes(cur.getUTCDay())) dates.push(cur.toISOString().split("T")[0]);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    setPreview(dates);
  }, [rDesde, rHasta, diasSel]);

  const esSabado = (fecha: string) => new Date(fecha + "T12:00:00Z").getUTCDay() === 6;

  // Límite de cierre según días seleccionados
  const cierreMaximo = () => {
    const soloSab = diasSel.every(d => d === 6);
    return soloSab ? CLINICA.sabado.cierre : CLINICA.semana.cierre;
  };

  const validar = (entrada: string, salida: string, sabado: boolean): string | null => {
    const cierre = sabado ? CLINICA.sabado.cierre : CLINICA.semana.cierre;
    if (entrada < CLINICA.semana.apertura) return `La clínica abre a las ${CLINICA.semana.apertura}`;
    if (salida > cierre) return `La clínica cierra a las ${cierre}${sabado ? " los sábados" : ""}`;
    if (salida <= entrada) return "La hora de salida debe ser posterior a la de entrada";
    return null;
  };

  // Guardar carga semanal
  const guardarRango = async () => {
    if (!rEntrada || !rSalida) { toast("Completá los horarios", "warning"); return; }
    if (preview.length === 0) { toast("No hay fechas en el rango seleccionado", "warning"); return; }

    const tieneSab = diasSel.includes(6);
    const tieneSemana = diasSel.some(d => d >= 1 && d <= 5);

    if (tieneSab && !tieneSemana) {
      const err = validar(rEntrada, rSalida, true);
      if (err) { toast(err, "warning"); return; }
    }
    if (tieneSemana) {
      const err = validar(rEntrada, rSalida, false);
      if (err) { toast(err, "warning"); return; }
    }

    setGuardando(true);
    const entries = preview.map(fecha => ({
      id_medico: user!.id,
      id_especialidad: idEspecialidad,
      fecha,
      hora_entrada: rEntrada,
      hora_salida: esSabado(fecha) ? (rSalida > CLINICA.sabado.cierre ? CLINICA.sabado.cierre : rSalida) : rSalida,
      duracion,
    }));

    const res = await fetch("/api/agenda/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token! },
      body: JSON.stringify({ entries }),
    }).then(r => r.json());

    setGuardando(false);
    if (res.codigo === 200) {
      const msg = res.omitidos > 0
        ? `${res.creados} días agregados (${res.omitidos} ya existían)`
        : `${res.creados} días agregados a la agenda`;
      toast(msg);
      setREntrada(""); setRSalida(""); setRHasta(""); setPreview([]);
      cargarMes();
    } else toast(res.error || "Error al guardar", "error");
  };

  const fechaYaTieneAgenda = (fecha: string) =>
    todasAgendas.some(a => a.fecha.slice(0, 10) === fecha);

  // Guardar día específico
  const guardarDia = async () => {
    if (!dEntrada || !dSalida) { toast("Completá los horarios", "warning"); return; }
    const dow = new Date(dFecha + "T12:00:00Z").getUTCDay();
    if (dow === 0) { toast("La clínica no abre los domingos", "warning"); return; }
    const err = validar(dEntrada, dSalida, dow === 6);
    if (err) { toast(err, "warning"); return; }
    if (fechaYaTieneAgenda(dFecha)) { toast("Ya tenés agenda cargada para ese día. Eliminala primero si querés modificarla.", "warning"); return; }

    const res = await fetch("/api/agenda", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token! },
      body: JSON.stringify({ id_medico: user!.id, id_especialidad: idEspecialidad, fecha: dFecha, hora_entrada: dEntrada, hora_salida: dSalida, duracion }),
    }).then(r => r.json());

    if (res.codigo === 200) {
      toast("Día agregado");
      setDEntrada(""); setDSalida("");
      cargarMes();
    } else toast(res.error || "Error al guardar", "error");
  };

  const eliminar = async (id: number, tieneActivos: boolean) => {
    const url = tieneActivos ? `/api/agenda/${id}/cancelar` : `/api/agenda/${id}`;
    const method = tieneActivos ? "POST" : "DELETE";
    const res = await fetch(url, { method, headers: { Authorization: token! } }).then(r => r.json());
    if (res.codigo === 200) {
      const msg = tieneActivos
        ? `Día cancelado — ${res.turnosCancelados} paciente${res.turnosCancelados !== 1 ? "s" : ""} notificado${res.turnosCancelados !== 1 ? "s" : ""}`
        : "Horario eliminado";
      toast(msg);
      cargarMes();
    } else toast(res.error || "No se puede eliminar", "error");
    setConfirmDelete(null);
  };

  const navMes = (delta: number) => {
    const [y, m] = mesVista.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMesVista(d.toISOString().slice(0, 7));
  };

  const formatMes = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("es-AR", {
      month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires",
    });
  };

  const formatFecha = (iso: string) => {
    const [y, m, d] = iso.split("T")[0].split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("es-AR", {
      weekday: "long", day: "numeric", month: "short",
      timeZone: "America/Argentina/Buenos_Aires",
    });
  };

  const soloSabSelec = diasSel.every(d => d === 6);
  const incSabYSem = diasSel.includes(6) && diasSel.some(d => d >= 1 && d <= 5);

  const formatDiaFecha = (iso: string) =>
    new Date(iso + "T12:00:00Z").toLocaleDateString("es-AR", {
      weekday: "long", day: "numeric", month: "long",
      timeZone: "America/Argentina/Buenos_Aires",
    });

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="page-title">Gestión de Agenda</h1>

      {/* Formulario de carga */}
      <div className="card mb-6">

        {/* Selector de modo */}
        <div className="flex gap-2 mb-2">
          {(["rango", "dia"] as const).map(m => (
            <button key={m} onClick={() => setModo(m)}
              className={modo === m ? "tab-active" : "tab-inactive"}>
              {m === "rango" ? "Carga por período" : "Día suelto"}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mb-5">
          {modo === "rango"
            ? "Generá varios días de una vez eligiendo un período y qué días de la semana trabajás."
            : "Agregá un día puntual, por ejemplo una guardia o fecha especial."}
        </p>

        {modo === "rango" && (
          <div className="space-y-5">

            {/* Paso 1: Período */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">1 · Período</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Desde</label>
                  <input type="date" className="input-field" value={rDesde} min={hoy} onChange={e => setRDesde(e.target.value)} />
                </div>
                <div>
                  <label className="label-field">Hasta</label>
                  <input type="date" className="input-field" value={rHasta} min={rDesde || hoy} onChange={e => setRHasta(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Paso 2: Días de la semana */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">2 · Días que trabajás</p>
              <div className="flex gap-2 flex-wrap">
                {DIAS.map(d => (
                  <button key={d.key} type="button"
                    onClick={() => setDiasSel(prev => prev.includes(d.key) ? prev.filter(x => x !== d.key) : [...prev, d.key])}
                    className={`w-12 h-12 rounded-xl text-sm font-bold transition-colors border-2 ${
                      diasSel.includes(d.key)
                        ? d.key === 6 ? "bg-orange-500 border-orange-500 text-white" : "bg-brand-700 border-brand-700 text-white"
                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}>
                    {d.label}
                  </button>
                ))}
              </div>
              {diasSel.includes(6) && (
                <p className="text-xs text-orange-600 mt-2">
                  {soloSabSelec
                    ? "Los sábados la clínica cierra a las 13:00 — ese será el máximo"
                    : "Los sábados la clínica cierra a las 13:00. Si el horario supera esa hora, se ajusta automáticamente"}
                </p>
              )}
            </div>

            {/* Paso 3: Horarios */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">3 · Horario</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Entrada</label>
                  <select className="select-field" value={rEntrada} onChange={e => { setREntrada(e.target.value); setRSalida(""); }}>
                    <option value="">Seleccioná</option>
                    {HORAS.filter(h => h < cierreMaximo()).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-field">
                    Salida{soloSabSelec && <span className="text-orange-500 text-xs ml-1">(máx 12:30)</span>}
                  </label>
                  <select className="select-field" value={rSalida} onChange={e => setRSalida(e.target.value)} disabled={!rEntrada}>
                    <option value="">Seleccioná</option>
                    {HORAS.filter(h => h > rEntrada && (soloSabSelec ? h < cierreMaximo() : h <= cierreMaximo())).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Paso 4: Duración */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">4 · Duración de cada turno</p>
              <div className="flex gap-2 flex-wrap">
                {DURACIONES.map(d => (
                  <button key={d} type="button" onClick={() => setDuracion(d)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors border-2 ${
                      duracion === d ? "bg-brand-700 border-brand-700 text-white" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}>
                    {d} min
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {preview.length > 0 && (
              <div className={`rounded-lg px-4 py-3 text-sm ${incSabYSem ? "bg-orange-50 text-orange-800" : "bg-brand-50 text-brand-700"}`}>
                <p className="font-semibold mb-2">
                  Se generarán <strong>{preview.length} días</strong>
                  {incSabYSem && " (sábados ajustados a 13:00)"}
                </p>
                <ul className="space-y-0.5 text-xs">
                  {preview.slice(0, 5).map(f => (
                    <li key={f} className="capitalize">{formatDiaFecha(f)}</li>
                  ))}
                  {preview.length > 5 && (
                    <li className="text-slate-400">y {preview.length - 5} días más…</li>
                  )}
                </ul>
              </div>
            )}

            <button onClick={guardarRango} className="btn-primary" disabled={preview.length === 0 || !rEntrada || !rSalida || guardando}>
              {guardando ? "Generando..." : `Generar ${preview.length > 0 ? preview.length + " días" : "agenda"}`}
            </button>
          </div>
        )}

        {modo === "dia" && (
          <div className="space-y-5">

            {/* Fecha */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">1 · Fecha</p>
              <input type="date" className="input-field max-w-xs" value={dFecha} min={hoy}
                onChange={e => { setDFecha(e.target.value); setDEntrada(""); setDSalida(""); }} />
              {dFecha && (
                <p className="text-sm text-slate-600 mt-1 capitalize font-medium">{formatDiaFecha(dFecha)}</p>
              )}
              {fechaYaTieneAgenda(dFecha) && (
                <div className="flex items-start gap-2 text-amber-800 bg-amber-50 border border-amber-200 text-xs rounded-lg px-3 py-2 mt-2">
                  <span>⚠</span>
                  <span>Ya tenés agenda cargada para este día. Eliminala desde el calendario si querés modificarla.</span>
                </div>
              )}
            </div>

            {/* Horario */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">2 · Horario</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Entrada</label>
                  <select className="select-field" value={dEntrada} onChange={e => { setDEntrada(e.target.value); setDSalida(""); }} disabled={fechaYaTieneAgenda(dFecha)}>
                    <option value="">Seleccioná</option>
                    {HORAS.filter(h => h < (esSabado(dFecha) ? CLINICA.sabado.cierre : CLINICA.semana.cierre)).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-field">
                    Salida{esSabado(dFecha) && <span className="text-orange-500 text-xs ml-1">(máx 12:30)</span>}
                  </label>
                  <select className="select-field" value={dSalida} onChange={e => setDSalida(e.target.value)} disabled={!dEntrada || fechaYaTieneAgenda(dFecha)}>
                    <option value="">Seleccioná</option>
                    {HORAS.filter(h => h > dEntrada && (esSabado(dFecha) ? h < CLINICA.sabado.cierre : h <= CLINICA.semana.cierre)).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Duración */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">3 · Duración de cada turno</p>
              <div className="flex gap-2 flex-wrap">
                {DURACIONES.map(d => (
                  <button key={d} type="button" onClick={() => setDuracion(d)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors border-2 ${
                      duracion === d ? "bg-brand-700 border-brand-700 text-white" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                    }`}>
                    {d} min
                  </button>
                ))}
              </div>
            </div>

            <button onClick={guardarDia} className="btn-primary" disabled={fechaYaTieneAgenda(dFecha) || !dEntrada || !dSalida}>
              Guardar día
            </button>
          </div>
        )}
      </div>

      {/* Vista mensual */}
      <div className="card">
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => navMes(-1)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 font-bold transition-colors">‹</button>
          <h2 className="font-semibold text-slate-800 capitalize">{formatMes(mesVista)}</h2>
          <button onClick={() => navMes(1)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 font-bold transition-colors">›</button>
        </div>
        <p className="text-xs text-center text-slate-400 mb-4">
          {agendaMes.length === 0 ? "Sin días cargados" : `${agendaMes.length} día${agendaMes.length !== 1 ? "s" : ""} cargado${agendaMes.length !== 1 ? "s" : ""}`}
        </p>

        {loadingMes ? (
          <div className="flex items-center justify-center gap-2 py-6 text-slate-400">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Cargando...</span>
          </div>
        ) : agendaMes.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">No hay agenda cargada para este mes</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {agendaMes.map(a => (
              <li key={a.id} className="flex items-center justify-between py-2.5 px-1 hover:bg-slate-50 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${esSabado(a.fecha) ? "bg-orange-400" : "bg-brand-400"}`} />
                  <span className="text-sm text-slate-800 capitalize">{formatFecha(a.fecha)}</span>
                  <span className="text-sm text-slate-500 font-mono">{a.hora_entrada} – {a.hora_salida}</span>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{a.duracion} min</span>
                  {a.turnosActivos > 0 && (
                    <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      {a.turnosActivos} turno{a.turnosActivos !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setConfirmDelete({ id: a.id, turnosActivos: a.turnosActivos })}
                  className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors px-2"
                >
                  {a.turnosActivos > 0 ? "Cancelar día" : "Eliminar"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link href="/" className="btn-secondary mt-6 inline-block">← Volver al inicio</Link>

      {confirmDelete !== null && (
        <ConfirmDialog
          message={
            confirmDelete.turnosActivos > 0
              ? `Este día tiene ${confirmDelete.turnosActivos} turno${confirmDelete.turnosActivos !== 1 ? "s" : ""} activo${confirmDelete.turnosActivos !== 1 ? "s" : ""}. Se cancelarán todos y se notificará a los pacientes por email.`
              : "¿Eliminar este horario de la agenda?"
          }
          confirmLabel={confirmDelete.turnosActivos > 0 ? "Cancelar día y notificar" : "Eliminar"}
          onConfirm={() => eliminar(confirmDelete.id, confirmDelete.turnosActivos > 0)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
