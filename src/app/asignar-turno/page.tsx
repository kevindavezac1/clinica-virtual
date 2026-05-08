"use client";
import { toast } from "@/lib/toast";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useRouter } from "next/navigation";

interface Especialidad { id: number; descripcion: string; }
interface Profesional { id_medico: number; nombre: string; apellido: string; }
interface Paciente { id: number; nombre: string; apellido: string; rol: string; dni: string; }

function generarHoras(entrada: string, salida: string, duracion: number): string[] {
  const horas: string[] = [];
  const start = new Date(`1970-01-01T${entrada}:00`);
  const end = new Date(`1970-01-01T${salida}:00`);
  while (start < end) {
    horas.push(`${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`);
    start.setMinutes(start.getMinutes() + duracion);
  }
  return horas;
}

export default function AsignarTurnoPage() {
  return (
    <ProtectedRoute allowedRole="Operador">
      <AsignarTurno />
    </ProtectedRoute>
  );
}

function AsignarTurno() {
  const { token } = useAuth();
  const router = useRouter();
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [fechasDisponibles, setFechasDisponibles] = useState<string[]>([]);
  const [horasDisponibles, setHorasDisponibles] = useState<string[]>([]);
  const [agenda, setAgenda] = useState<Record<string, unknown>[]>([]);
  const [idAgenda, setIdAgenda] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [feriados, setFeriados] = useState<Set<string>>(new Set());
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  const [calMes, setCalMes] = useState(hoy.slice(0, 7));

  const [busquedaPaciente, setBusquedaPaciente] = useState("");
  const [sugerencias, setSugerencias] = useState<Paciente[]>([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<Paciente | null>(null);
  const [coberturaNombre, setCoberturaNombre] = useState("");
  const [buscando, setBuscando] = useState(false);

  const [form, setForm] = useState({
    paciente: "", cobertura: "", especialidad: "", profesional: "", fecha: "", hora: "", notas: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/especialidades", { headers: { Authorization: token! } }).then(r => r.json()),
      fetch("/api/feriados", { headers: { Authorization: token! } }).then(r => r.json()),
    ]).then(([espData, feriadosData]) => {
      if (espData.payload) setEspecialidades(espData.payload);
      if (feriadosData.payload) setFeriados(new Set(feriadosData.payload.map((f: { fecha: string }) => f.fecha)));
    });
  }, [token]);

  useEffect(() => {
    if (busquedaPaciente.length < 2) { setSugerencias([]); return; }
    const t = setTimeout(async () => {
      setBuscando(true);
      const res = await fetch("/api/usuarios", { headers: { Authorization: token! } }).then(r => r.json());
      if (res.payload) {
        const q = busquedaPaciente.toLowerCase();
        setSugerencias(
          (res.payload as Paciente[])
            .filter(u => u.rol === "Paciente" && (
              `${u.apellido} ${u.nombre}`.toLowerCase().includes(q) ||
              u.dni?.includes(q)
            ))
            .slice(0, 8)
        );
      }
      setBuscando(false);
    }, 300);
    return () => clearTimeout(t);
  }, [busquedaPaciente, token]);

  const seleccionarPaciente = async (p: Paciente) => {
    setPacienteSeleccionado(p);
    setBusquedaPaciente("");
    setSugerencias([]);
    setCoberturaNombre("");
    setForm(f => ({ ...f, paciente: String(p.id), cobertura: "" }));
    const d = await fetch(`/api/coberturas/usuario/${p.id}`, { headers: { Authorization: token! } }).then(r => r.json());
    if (d.payload) {
      setForm(f => ({ ...f, cobertura: String(d.payload.id) }));
      setCoberturaNombre(d.payload.nombre);
    }
  };

  const limpiarPaciente = () => {
    setPacienteSeleccionado(null);
    setBusquedaPaciente("");
    setSugerencias([]);
    setCoberturaNombre("");
    setForm(f => ({ ...f, paciente: "", cobertura: "" }));
  };

  const onEspecialidadChange = async (id: string) => {
    setForm(f => ({ ...f, especialidad: id, profesional: "", fecha: "", hora: "" }));
    setProfesionales([]); setFechasDisponibles([]); setHorasDisponibles([]);
    setAgenda([]); setIdAgenda(null);
    if (!id) return;
    const d = await fetch(`/api/medico-especialidad/especialidad/${id}`, { headers: { Authorization: token! } }).then(r => r.json());
    if (d.payload) setProfesionales(d.payload);
  };

  const onProfesionalChange = async (id: string) => {
    setForm(f => ({ ...f, profesional: id, fecha: "", hora: "" }));
    setFechasDisponibles([]); setHorasDisponibles([]);
    setAgenda([]); setIdAgenda(null);
    if (!id) return;
    const d = await fetch(`/api/agenda/medico/${id}`, { headers: { Authorization: token! } }).then(r => r.json());
    const ag = d.payload || [];
    setAgenda(ag);
    const fechas = ag
      .map((a: Record<string, string>) => new Date(a.fecha).toISOString().split("T")[0])
      .filter((f: string) => f >= hoy && !feriados.has(f))
      .sort();
    const disponibles = [...new Set(fechas)] as string[];
    setFechasDisponibles(disponibles);
    if (disponibles.length > 0) setCalMes(disponibles[0].slice(0, 7));
  };

  const onFechaChange = async (fecha: string) => {
    setForm(f => ({ ...f, fecha, hora: "" }));
    setHorasDisponibles([]); setIdAgenda(null);
    if (!fecha || !form.profesional) return;

    const agendaFecha = agenda.filter((a: Record<string, unknown>) =>
      new Date(a.fecha as string).toISOString().split("T")[0] === fecha
    );
    if (agendaFecha.length === 0) return;

    const agendaItem = agendaFecha[0] as Record<string, string | number>;
    setIdAgenda(agendaItem.id as number);

    const turnosRes = await fetch("/api/turnos/medico", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token! },
      body: JSON.stringify({ id_medico: Number(form.profesional), fecha }),
    }).then(r => r.json());

    const ocupadas = (turnosRes.payload || [])
      .filter((t: Record<string, string>) => t.estado !== "Cancelado")
      .map((t: Record<string, string>) => t.hora.padStart(5, "0"));

    const ahora = new Date();
    setHorasDisponibles(
      [...new Set(
        agendaFecha.flatMap((a: Record<string, unknown>) =>
          generarHoras(a.hora_entrada as string, a.hora_salida as string, (a.duracion as number) ?? 30)
        )
      )]
        .sort()
        .filter(h => !ocupadas.includes(h))
        .filter(h => {
          const turnoDateTime = new Date(`${fecha}T${h}:00-03:00`);
          return (turnoDateTime.getTime() - ahora.getTime()) >= 30 * 60_000;
        })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!pacienteSeleccionado) { setError("Seleccioná un paciente."); return; }
    if (!idAgenda) { setError("Seleccioná una fecha y hora válidas."); return; }
    if (loading) return;
    setLoading(true);
    const turnoData = {
      nota: form.notas, id_agenda: idAgenda, fecha: form.fecha, hora: form.hora,
      id_paciente: Number(form.paciente), id_cobertura: Number(form.cobertura),
    };
    const res = await fetch("/api/turnos", { method: "POST", headers: { "Content-Type": "application/json", Authorization: token! }, body: JSON.stringify(turnoData) });
    const data = await res.json();
    setLoading(false);
    if (data.codigo === 200) { toast("Turno asignado correctamente"); router.push("/"); }
    else setError(data.mensaje || data.error || "Error al asignar el turno");
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="page-title">Asignar Turno</h1>
      <form onSubmit={handleSubmit} className="card space-y-4">

        {/* Buscador de paciente */}
        <div>
          <label className="label-field">Paciente</label>
          {pacienteSeleccionado ? (
            <div className="input-field bg-slate-50 flex items-center justify-between">
              <span className="text-slate-800 font-medium">
                {pacienteSeleccionado.apellido}, {pacienteSeleccionado.nombre}
                <span className="ml-2 text-slate-400 font-normal text-xs">DNI {pacienteSeleccionado.dni}</span>
              </span>
              <button type="button" onClick={limpiarPaciente} className="text-slate-400 hover:text-slate-600 ml-2 text-sm transition-colors">✕</button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                className="input-field"
                placeholder="Buscá por nombre, apellido o DNI..."
                value={busquedaPaciente}
                onChange={e => setBusquedaPaciente(e.target.value)}
              />
              {buscando && <p className="text-xs text-slate-400 mt-1">Buscando...</p>}
              {sugerencias.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-slate-200 rounded-xl shadow-lg mt-1 divide-y divide-slate-100">
                  {sugerencias.map(p => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => seleccionarPaciente(p)}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm transition-colors"
                      >
                        <span className="font-semibold text-slate-800">{p.apellido}, {p.nombre}</span>
                        <span className="ml-2 text-slate-400 text-xs">DNI {p.dni}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="label-field">Cobertura</label>
          <input
            className="input-field bg-slate-50 text-slate-500 cursor-default"
            value={coberturaNombre || (pacienteSeleccionado ? "Cargando..." : "Se carga al elegir paciente")}
            readOnly
          />
        </div>

        <div>
          <label className="label-field">Especialidad</label>
          <select className="select-field" value={form.especialidad} onChange={e => onEspecialidadChange(e.target.value)} required>
            <option value="">Seleccioná una especialidad</option>
            {especialidades.map(e => <option key={e.id} value={e.id}>{e.descripcion}</option>)}
          </select>
        </div>
        <div>
          <label className="label-field">Profesional</label>
          <select className="select-field" value={form.profesional} onChange={e => onProfesionalChange(e.target.value)} required disabled={!form.especialidad}>
            <option value="">Seleccioná un profesional</option>
            {profesionales.map(p => <option key={p.id_medico} value={p.id_medico}>{p.nombre} {p.apellido}</option>)}
          </select>
        </div>
        {/* Calendario de fechas disponibles */}
        {form.profesional && (
          <div>
            <label className="label-field">Fecha</label>
            {fechasDisponibles.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">El médico no tiene agenda cargada</p>
            ) : (() => {
              const fechasSet = new Set(fechasDisponibles);
              const [cy, cm] = calMes.split("-").map(Number);
              const primerDia = new Date(Date.UTC(cy, cm - 1, 1));
              const diasEnMes = new Date(Date.UTC(cy, cm, 0)).getUTCDate();
              let startDow = primerDia.getUTCDay();
              startDow = startDow === 0 ? 6 : startDow - 1;
              const celdas: (string | null)[] = [
                ...Array(startDow).fill(null),
                ...Array.from({ length: diasEnMes }, (_, i) => {
                  const d = i + 1;
                  return `${cy}-${String(cm).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                }),
              ];
              const labelMes = new Date(Date.UTC(cy, cm - 1, 15)).toLocaleDateString("es-AR", {
                month: "long", year: "numeric", timeZone: "UTC",
              });
              const navMes = (delta: number) => {
                const d = new Date(Date.UTC(cy, cm - 1 + delta, 1));
                setCalMes(d.toISOString().slice(0, 7));
              };
              return (
                <div className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <button type="button" onClick={() => navMes(-1)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 font-bold transition-colors">‹</button>
                    <span className="text-sm font-semibold text-slate-700 capitalize">{labelMes}</span>
                    <button type="button" onClick={() => navMes(1)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 font-bold transition-colors">›</button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"].map(d => (
                      <div key={d} className="text-center text-xs text-slate-500 font-semibold py-1">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {celdas.map((fecha, i) => {
                      if (!fecha) return <div key={`e-${i}`} />;
                      const disponible = fechasSet.has(fecha);
                      const seleccionado = form.fecha === fecha;
                      return (
                        <button
                          key={fecha}
                          type="button"
                          disabled={!disponible}
                          onClick={() => onFechaChange(fecha)}
                          className={`aspect-square flex items-center justify-center rounded-lg text-sm transition-colors font-medium
                            ${seleccionado
                              ? "bg-brand-700 text-white shadow-sm"
                              : disponible
                                ? "bg-brand-50 text-brand-700 hover:bg-brand-100 cursor-pointer"
                                : "text-slate-300 cursor-default"
                            }`}
                        >
                          {Number(fecha.split("-")[2])}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        <div>
          <label className="label-field">Hora</label>
          <select className="select-field" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} required disabled={horasDisponibles.length === 0}>
            <option value="">Seleccioná una hora</option>
            {horasDisponibles.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div>
          <label className="label-field">Notas</label>
          <input className="input-field" value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Observaciones..." />
        </div>
        {error && <p className="error-msg">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" className="btn-primary flex-1" disabled={loading}>{loading ? "Asignando..." : "Asignar turno"}</button>
          <button type="button" onClick={() => router.push("/")} className="btn-secondary flex-1">Cancelar</button>
        </div>
      </form>
    </div>
  );
}
