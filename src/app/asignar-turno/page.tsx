"use client";
import { toast } from "@/lib/toast";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useRouter } from "next/navigation";

interface Especialidad { id: number; descripcion: string; }
interface Profesional { id_medico: number; nombre: string; apellido: string; }
interface Paciente { id: number; nombre: string; apellido: string; rol: string; }

function generarHoras(entrada: string, salida: string): string[] {
  const horas: string[] = [];
  const start = new Date(`1970-01-01T${entrada}:00`);
  const end = new Date(`1970-01-01T${salida}:00`);
  while (start < end) {
    horas.push(`${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`);
    start.setMinutes(start.getMinutes() + 30);
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
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [fechasDisponibles, setFechasDisponibles] = useState<string[]>([]);
  const [horasDisponibles, setHorasDisponibles] = useState<string[]>([]);
  const [agenda, setAgenda] = useState<Record<string, unknown>[]>([]);
  const [idAgenda, setIdAgenda] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [feriados, setFeriados] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    paciente: "", cobertura: "", especialidad: "", profesional: "", fecha: "", hora: "", notas: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/especialidades", { headers: { Authorization: token! } }).then(r => r.json()),
      fetch("/api/usuarios", { headers: { Authorization: token! } }).then(r => r.json()),
      fetch("/api/feriados", { headers: { Authorization: token! } }).then(r => r.json()),
    ]).then(([espData, usersData, feriadosData]) => {
      if (espData.payload) setEspecialidades(espData.payload);
      if (usersData.payload) setPacientes(usersData.payload.filter((u: Paciente) => u.rol === "Paciente"));
      if (feriadosData.payload) setFeriados(new Set(feriadosData.payload.map((f: { fecha: string }) => f.fecha)));
    });
  }, [token]);

  const onPacienteChange = async (id: string) => {
    setForm(f => ({ ...f, paciente: id, cobertura: "" }));
    if (!id) return;
    const d = await fetch(`/api/coberturas/usuario/${id}`, { headers: { Authorization: token! } }).then(r => r.json());
    if (d.payload) setForm(f => ({ ...f, cobertura: String(d.payload.id) }));
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
    const today = new Date().toISOString().split("T")[0];
    const fechas = ag
      .map((a: Record<string, string>) => new Date(a.fecha).toISOString().split("T")[0])
      .filter((f: string) => f >= today && !feriados.has(f));
    setFechasDisponibles([...new Set(fechas)] as string[]);
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

    const todayAR = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
    const ahoraAR = new Date().toLocaleTimeString("en-GB", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit" });

    const todasHoras = agendaFecha.flatMap((a: Record<string, unknown>) =>
      generarHoras(a.hora_entrada as string, a.hora_salida as string)
    );
    const ahora = new Date();
    setHorasDisponibles(
      todasHoras
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
    if (!idAgenda) { setError("Seleccioná una fecha y hora válidas."); return; }
    const turnoData = {
      nota: form.notas, id_agenda: idAgenda, fecha: form.fecha, hora: form.hora,
      id_paciente: Number(form.paciente), id_cobertura: Number(form.cobertura),
    };
    const res = await fetch("/api/turnos", { method: "POST", headers: { "Content-Type": "application/json", Authorization: token! }, body: JSON.stringify(turnoData) });
    const data = await res.json();
    if (data.codigo === 200) { toast("Turno asignado correctamente"); router.push("/"); }
    else setError(data.mensaje || data.error || "Error al asignar el turno");
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="page-title">Asignar Turno</h1>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label-field">Paciente</label>
          <select className="select-field" value={form.paciente} onChange={e => onPacienteChange(e.target.value)} required>
            <option value="">Seleccioná un paciente</option>
            {pacientes.map(p => <option key={p.id} value={p.id}>{p.apellido}, {p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="label-field">Cobertura</label>
          <input className="input-field bg-gray-50" value={form.cobertura ? `Cobertura ID: ${form.cobertura}` : "Se carga al elegir paciente"} readOnly />
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
        <div>
          <label className="label-field">Fecha</label>
          <select className="select-field" value={form.fecha} onChange={e => onFechaChange(e.target.value)} required disabled={fechasDisponibles.length === 0}>
            <option value="">Seleccioná una fecha</option>
            {fechasDisponibles.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
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
          <button type="submit" className="btn-primary flex-1">Asignar turno</button>
          <button type="button" onClick={() => router.push("/")} className="btn-secondary flex-1">Cancelar</button>
        </div>
      </form>
    </div>
  );
}
