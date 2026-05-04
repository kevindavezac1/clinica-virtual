"use client";
import { toast } from "@/lib/toast";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useRouter } from "next/navigation";

interface Especialidad { id: number; descripcion: string; }
interface Profesional { id_medico: number; nombre: string; apellido: string; }
interface Cobertura { id: number; nombre: string; }

export default function NuevoTurnoPage() {
  return (
    <ProtectedRoute allowedRole="Paciente">
      <NuevoTurno />
    </ProtectedRoute>
  );
}

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

function NuevoTurno() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [cobertura, setCobertura] = useState<Cobertura | null>(null);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [horasDisponibles, setHorasDisponibles] = useState<string[]>([]);
  const [idAgenda, setIdAgenda] = useState<number | null>(null);
  const [aviso, setAviso] = useState("");
  const [feriados, setFeriados] = useState<Set<string>>(new Set());
  const [agenda, setAgenda] = useState<Record<string, unknown>[]>([]);
  const [fechasDisponibles, setFechasDisponibles] = useState<string[]>([]);
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
  const [calMes, setCalMes] = useState(hoy.slice(0, 7));

  const [form, setForm] = useState({
    especialidad: "", profesional: "", fecha: "", hora: "", notas: "",
  });

  useEffect(() => {
    if (!user) return;
    fetch(`/api/coberturas/usuario/${user.id}`, { headers: { Authorization: token! } })
      .then(r => r.json()).then(d => { if (d.payload) setCobertura(d.payload); });
    fetch("/api/especialidades", { headers: { Authorization: token! } })
      .then(r => r.json()).then(d => { if (d.payload) setEspecialidades(d.payload); });
    fetch("/api/feriados", { headers: { Authorization: token! } })
      .then(r => r.json()).then(d => {
        if (d.payload) setFeriados(new Set(d.payload.map((f: { fecha: string }) => f.fecha)));
      });
  }, [user, token]);

  const onEspecialidadChange = async (id: string) => {
    setForm(f => ({ ...f, especialidad: id, profesional: "", fecha: "", hora: "" }));
    setProfesionales([]);
    setHorasDisponibles([]);
    if (!id) return;
    const d = await fetch(`/api/medico-especialidad/especialidad/${id}`, { headers: { Authorization: token! } }).then(r => r.json());
    if (d.payload) setProfesionales(d.payload);
  };

  const onProfesionalChange = async (id: string) => {
    setForm(f => ({ ...f, profesional: id, fecha: "", hora: "" }));
    setHorasDisponibles([]);
    setAgenda([]);
    setFechasDisponibles([]);
    setIdAgenda(null);
    setAviso("");
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
    setAviso("");
    setHorasDisponibles([]);
    setIdAgenda(null);
    if (!fecha) return;
    const agendaFecha = agenda.filter((a: Record<string, unknown>) =>
      new Date(a.fecha as string).toISOString().split("T")[0] === fecha
    );
    if (agendaFecha.length === 0) return;
    setIdAgenda(agendaFecha[0].id as number);
    const turnosRes = await fetch("/api/turnos/medico", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token! },
      body: JSON.stringify({ id_medico: Number(form.profesional), fecha }),
    }).then(r => r.json());
    const ocupadas = (turnosRes.payload || [])
      .filter((t: Record<string, string>) => t.estado !== "Cancelado")
      .map((t: Record<string, string>) => t.hora.padStart(5, "0"));
    const ahora = new Date();
    const disponibles = [...new Set<string>(
      agendaFecha.flatMap((a: Record<string, unknown>) =>
        generarHoras(a.hora_entrada as string, a.hora_salida as string, (a.duracion as number) ?? 30)
      )
    )]
      .sort()
      .filter((h: string) => !ocupadas.includes(h))
      .filter((h: string) => {
        const turnoDateTime = new Date(`${fecha}T${h}:00-03:00`);
        return (turnoDateTime.getTime() - ahora.getTime()) >= 30 * 60_000;
      });
    if (disponibles.length === 0) { setAviso("No hay horarios disponibles para este día."); return; }
    setHorasDisponibles(disponibles);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idAgenda || !cobertura) return;
    const turnoData = { nota: form.notas, id_agenda: idAgenda, fecha: form.fecha, hora: form.hora, id_paciente: user!.id, id_cobertura: cobertura.id };
    const res = await fetch("/api/turnos", { method: "POST", headers: { "Content-Type": "application/json", Authorization: token! }, body: JSON.stringify(turnoData) });
    const data = await res.json();
    if (data.codigo === 200) {
      toast(`Turno confirmado el ${form.fecha} a las ${form.hora}`);
      router.push("/");
    } else toast(data.mensaje || "Error al asignar el turno", "error");
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="page-title">Nuevo Turno</h1>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label-field">Cobertura</label>
          <input className="input-field bg-gray-50" value={cobertura?.nombre || "Cargando..."} readOnly />
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
        {form.profesional && (
          <div>
            <label className="label-field">Fecha</label>
            {fechasDisponibles.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">El profesional no tiene agenda disponible</p>
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
                <div className="border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-3">
                    <button type="button" onClick={() => navMes(-1)} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 font-bold">‹</button>
                    <span className="text-sm font-semibold text-gray-700 capitalize">{labelMes}</span>
                    <button type="button" onClick={() => navMes(1)} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 font-bold">›</button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"].map(d => (
                      <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
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
                              ? "bg-blue-600 text-white"
                              : disponible
                                ? "bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
                                : "text-gray-300 cursor-default"
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
        {aviso && <p className="text-amber-600 text-sm">{aviso}</p>}
        <div>
          <label className="label-field">Hora</label>
          <select className="select-field" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} required disabled={horasDisponibles.length === 0}>
            <option value="">Seleccioná una hora</option>
            {horasDisponibles.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div>
          <label className="label-field">Notas</label>
          <input className="input-field" value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Motivo de consulta u observaciones" />
        </div>
        <div className="flex gap-3">
          <button type="submit" className="btn-primary flex-1">Confirmar turno</button>
          <button type="button" onClick={() => router.push("/")} className="btn-secondary flex-1">Cancelar</button>
        </div>
      </form>
    </div>
  );
}
