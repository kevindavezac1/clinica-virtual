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

function NuevoTurno() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [cobertura, setCobertura] = useState<Cobertura | null>(null);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [horasDisponibles, setHorasDisponibles] = useState<string[]>([]);
  const [idAgenda, setIdAgenda] = useState<number | null>(null);
  const [aviso, setAviso] = useState("");

  const [form, setForm] = useState({
    especialidad: "", profesional: "", fecha: "", hora: "", notas: "",
  });

  useEffect(() => {
    if (!user) return;
    fetch(`/api/coberturas/usuario/${user.id}`, { headers: { Authorization: token! } })
      .then(r => r.json()).then(d => { if (d.payload) setCobertura(d.payload); });
    fetch("/api/especialidades", { headers: { Authorization: token! } })
      .then(r => r.json()).then(d => { if (d.payload) setEspecialidades(d.payload); });
  }, [user, token]);

  const onEspecialidadChange = async (id: string) => {
    setForm(f => ({ ...f, especialidad: id, profesional: "", fecha: "", hora: "" }));
    setProfesionales([]);
    setHorasDisponibles([]);
    if (!id) return;
    const d = await fetch(`/api/medico-especialidad/especialidad/${id}`, { headers: { Authorization: token! } }).then(r => r.json());
    if (d.payload) setProfesionales(d.payload);
  };

  const onProfesionalChange = (id: string) => {
    setForm(f => ({ ...f, profesional: id, fecha: "", hora: "" }));
    setHorasDisponibles([]);
  };

  const onFechaChange = async (fecha: string) => {
    setForm(f => ({ ...f, fecha, hora: "" }));
    setAviso("");
    setHorasDisponibles([]);
    if (!fecha || !form.profesional) return;
    const [agendaRes, turnosRes] = await Promise.all([
      fetch(`/api/agenda/medico/${form.profesional}`, { headers: { Authorization: token! } }).then(r => r.json()),
      fetch("/api/turnos/medico", { method: "POST", headers: { "Content-Type": "application/json", Authorization: token! }, body: JSON.stringify({ id_medico: Number(form.profesional), fecha }) }).then(r => r.json()),
    ]);
    const agendaFecha = (agendaRes.payload || []).filter((a: Record<string, string>) => new Date(a.fecha).toISOString().split("T")[0] === fecha);
    if (agendaFecha.length === 0) { setAviso("No hay agenda disponible para esta fecha."); return; }
    setIdAgenda(agendaFecha[0].id);
    const ocupadas = (turnosRes.payload || [])
      .filter((t: Record<string, string>) => t.estado !== "Cancelado")
      .map((t: Record<string, string>) => t.hora.padStart(5, "0"));

    const todayAR = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
    const ahoraAR = new Date().toLocaleTimeString("en-GB", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit" });

    const disponibles = agendaFecha
      .flatMap((a: Record<string, string>) => generarHoras(a.hora_entrada, a.hora_salida))
      .filter((h: string) => !ocupadas.includes(h))
      .filter((h: string) => fecha !== todayAR || h > ahoraAR);

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
    } else toast("Error al asignar el turno", "error");
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
        <div>
          <label className="label-field">Fecha</label>
          <input type="date" className="input-field" value={form.fecha} onChange={e => onFechaChange(e.target.value)} required disabled={!form.profesional} />
        </div>
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
