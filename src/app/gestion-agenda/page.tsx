"use client";
import { toast } from "@/lib/toast";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
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

interface AgendaEntry { id: number; fecha: string; hora_entrada: string; hora_salida: string; }

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
  const [modo, setModo] = useState<"rango" | "dia">("rango");

  // Vista mensual
  const [mesVista, setMesVista] = useState(hoy.slice(0, 7));
  const [agendaMes, setAgendaMes] = useState<AgendaEntry[]>([]);
  const [loadingMes, setLoadingMes] = useState(false);

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
    const del = ((res.payload || []) as AgendaEntry[])
      .filter(a => a.fecha.slice(0, 7) === mesVista)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    setAgendaMes(del);
    setLoadingMes(false);
  };

  useEffect(() => { cargarMes(); }, [user, mesVista]);

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

    if (tieneSab) {
      const err = validar(rEntrada, rSalida, true);
      if (err) { toast(`Sábados: ${err}`, "warning"); return; }
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

  // Guardar día específico
  const guardarDia = async () => {
    if (!dEntrada || !dSalida) { toast("Completá los horarios", "warning"); return; }
    const dow = new Date(dFecha + "T12:00:00Z").getUTCDay();
    if (dow === 0) { toast("La clínica no abre los domingos", "warning"); return; }
    const err = validar(dEntrada, dSalida, dow === 6);
    if (err) { toast(err, "warning"); return; }

    const res = await fetch("/api/agenda", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token! },
      body: JSON.stringify({ id_medico: user!.id, id_especialidad: idEspecialidad, fecha: dFecha, hora_entrada: dEntrada, hora_salida: dSalida }),
    }).then(r => r.json());

    if (res.codigo === 200) {
      toast("Día agregado");
      setDEntrada(""); setDSalida("");
      if (dFecha.slice(0, 7) === mesVista) cargarMes();
    } else toast(res.error || "Error al guardar", "error");
  };

  // Eliminar entrada de agenda
  const eliminar = async (id: number) => {
    if (!confirm("¿Eliminar este horario?")) return;
    const res = await fetch(`/api/agenda/${id}`, {
      method: "DELETE",
      headers: { Authorization: token! },
    }).then(r => r.json());
    if (res.codigo === 200) { toast("Horario eliminado"); cargarMes(); }
    else toast(res.error || "No se puede eliminar", "error");
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

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="page-title">Gestión de Agenda</h1>

      {/* Formulario de carga */}
      <div className="card mb-6">
        <div className="flex gap-2 mb-5">
          {(["rango", "dia"] as const).map(m => (
            <button key={m} onClick={() => setModo(m)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${modo === m ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {m === "rango" ? "Carga semanal" : "Día específico"}
            </button>
          ))}
        </div>

        {modo === "rango" && (
          <div className="space-y-4">
            <div>
              <label className="label-field">Días de la semana</label>
              <div className="flex gap-2 flex-wrap">
                {DIAS.map(d => (
                  <button key={d.key} type="button"
                    onClick={() => setDiasSel(prev => prev.includes(d.key) ? prev.filter(x => x !== d.key) : [...prev, d.key])}
                    className={`w-12 h-12 rounded-xl text-sm font-bold transition-colors border-2 ${
                      diasSel.includes(d.key)
                        ? d.key === 6 ? "bg-orange-500 border-orange-500 text-white" : "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}>
                    {d.label}
                  </button>
                ))}
              </div>
              {diasSel.includes(6) && (
                <p className="text-xs text-orange-600 mt-2">
                  {soloSabSelec
                    ? "Los sábados la clínica cierra a las 13:00 — ese será el máximo"
                    : "Los sábados la clínica cierra a las 13:00. Si el horario supera esa hora, el sábado se guardará hasta las 13:00"}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-field">Hora entrada</label>
                <select className="select-field" value={rEntrada} onChange={e => { setREntrada(e.target.value); setRSalida(""); }}>
                  <option value="">Seleccioná</option>
                  {HORAS.filter(h => h < "20:00").map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="label-field">
                  Hora salida
                  {soloSabSelec && <span className="text-orange-500 text-xs ml-1">(máx 13:00)</span>}
                </label>
                <select className="select-field" value={rSalida} onChange={e => setRSalida(e.target.value)} disabled={!rEntrada}>
                  <option value="">Seleccioná</option>
                  {HORAS.filter(h => h > rEntrada && h <= cierreMaximo()).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

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

            {preview.length > 0 && (
              <div className={`text-sm rounded-lg px-4 py-3 ${incSabYSem ? "bg-orange-50 text-orange-800" : "bg-blue-50 text-blue-800"}`}>
                Se generarán <strong>{preview.length} días</strong> de agenda
                {incSabYSem && " (los sábados se ajustarán a 13:00 si es necesario)"}
              </div>
            )}

            <button onClick={guardarRango} className="btn-primary" disabled={preview.length === 0 || !rEntrada || !rSalida || guardando}>
              {guardando ? "Generando..." : "Generar agenda"}
            </button>
          </div>
        )}

        {modo === "dia" && (
          <div className="space-y-4">
            <div>
              <label className="label-field">Fecha</label>
              <input type="date" className="input-field max-w-xs" value={dFecha} min={hoy} onChange={e => { setDFecha(e.target.value); setDEntrada(""); setDSalida(""); }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-field">Hora entrada</label>
                <select className="select-field" value={dEntrada} onChange={e => { setDEntrada(e.target.value); setDSalida(""); }}>
                  <option value="">Seleccioná</option>
                  {HORAS.filter(h => h < "20:00").map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="label-field">
                  Hora salida
                  {esSabado(dFecha) && <span className="text-orange-500 text-xs ml-1">(máx 13:00)</span>}
                </label>
                <select className="select-field" value={dSalida} onChange={e => setDSalida(e.target.value)} disabled={!dEntrada}>
                  <option value="">Seleccioná</option>
                  {HORAS.filter(h => h > dEntrada && h <= (esSabado(dFecha) ? CLINICA.sabado.cierre : CLINICA.semana.cierre)).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
            <button onClick={guardarDia} className="btn-primary">Guardar día</button>
          </div>
        )}
      </div>

      {/* Vista mensual */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navMes(-1)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600 font-bold">‹</button>
          <h2 className="font-semibold text-gray-800 capitalize">{formatMes(mesVista)}</h2>
          <button onClick={() => navMes(1)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600 font-bold">›</button>
        </div>

        {loadingMes ? (
          <p className="text-gray-400 text-sm text-center py-6">Cargando...</p>
        ) : agendaMes.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No hay agenda cargada para este mes</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {agendaMes.map(a => (
              <li key={a.id} className="flex items-center justify-between py-2.5 px-1 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${esSabado(a.fecha) ? "bg-orange-400" : "bg-blue-400"}`} />
                  <span className="text-sm text-gray-800 capitalize">{formatFecha(a.fecha)}</span>
                  <span className="text-sm text-gray-500 font-mono">{a.hora_entrada} – {a.hora_salida}</span>
                </div>
                <button onClick={() => eliminar(a.id)} className="text-xs text-red-500 hover:text-red-700 hover:underline px-2">
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link href="/" className="btn-secondary mt-6 inline-block">← Volver al inicio</Link>
    </div>
  );
}
