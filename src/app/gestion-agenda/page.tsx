"use client";
import { toast } from "@/lib/toast";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";

interface Horario { hora_entrada: string; hora_salida: string; }

const HORAS = Array.from({ length: 34 }, (_, i) => {
  const h = Math.floor(i / 2) + 6;
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

export default function GestionAgendaPage() {
  return (
    <ProtectedRoute allowedRole="Medico">
      <GestionAgenda />
    </ProtectedRoute>
  );
}

function GestionAgenda() {
  const { user, token } = useAuth();
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [existentes, setExistentes] = useState<Horario[]>([]);
  const [nuevos, setNuevos] = useState<Horario[]>([]);
  const [agregando, setAgregando] = useState(false);
  const [idEspecialidad, setIdEspecialidad] = useState<number>(1);

  const cargar = async (f: string) => {
    if (!user) return;
    const [espRes, agendaRes] = await Promise.all([
      fetch(`/api/medico-especialidad/medico/${user.id}`, { headers: { Authorization: token! } }).then(r => r.json()),
      fetch(`/api/agenda/medico/${user.id}`, { headers: { Authorization: token! } }).then(r => r.json()),
    ]);
    if (espRes.payload?.length > 0) setIdEspecialidad(espRes.payload[0].id_especialidad);
    const delDia = (agendaRes.payload || []).filter((a: Record<string, string>) => new Date(a.fecha).toISOString().split("T")[0] === f);
    setExistentes(delDia);
  };

  useEffect(() => { cargar(fecha); }, [user, fecha]);

  const verificarSuperposicion = (entrada: string, salida: string) =>
    existentes.some(h => !(salida <= h.hora_entrada || entrada >= h.hora_salida));

  const guardar = async () => {
    for (const h of nuevos) {
      if (!h.hora_entrada || !h.hora_salida) { toast("Completá todas las horas.", "warning"); return; }
      if (h.hora_salida <= h.hora_entrada) { toast("La hora de salida debe ser posterior a la de entrada.", "warning"); return; }
      if (verificarSuperposicion(h.hora_entrada, h.hora_salida)) { toast("Un horario se superpone con uno existente.", "warning"); return; }
    }
    for (const h of nuevos) {
      await fetch("/api/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token! },
        body: JSON.stringify({ id_medico: user!.id, id_especialidad: idEspecialidad, fecha, hora_entrada: h.hora_entrada, hora_salida: h.hora_salida }),
      });
    }
    setAgregando(false);
    setNuevos([]);
    cargar(fecha);
    toast("Agenda guardada correctamente");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="page-title">Gestión de Agenda</h1>
      <div className="mb-6">
        <label className="label-field">Seleccioná una fecha</label>
        <input type="date" className="input-field max-w-xs" value={fecha} onChange={e => { setFecha(e.target.value); }} />
      </div>

      {existentes.length > 0 && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-700 mb-3">Horarios para el {fecha}:</h2>
          <table className="w-full text-sm">
            <thead><tr><th className="table-header rounded-tl">Hora entrada</th><th className="table-header rounded-tr">Hora salida</th></tr></thead>
            <tbody>
              {existentes.map((h, i) => (
                <tr key={i}><td className="table-cell">{h.hora_entrada}</td><td className="table-cell">{h.hora_salida}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!agregando ? (
        <div className="flex gap-3">
          <button onClick={() => { setAgregando(true); setNuevos([{ hora_entrada: "", hora_salida: "" }]); }} className="btn-primary">
            + Agregar nuevo horario
          </button>
          <Link href="/" className="btn-secondary">Volver al inicio</Link>
        </div>
      ) : (
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700">Agregar nuevos horarios</h2>
          {nuevos.map((h, i) => (
            <div key={i} className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="label-field">Hora entrada</label>
                <select className="select-field" value={h.hora_entrada} onChange={e => setNuevos(n => n.map((x, j) => j === i ? { ...x, hora_entrada: e.target.value } : x))}>
                  <option value="">Seleccioná</option>
                  {HORAS.map(hr => <option key={hr} value={hr}>{hr}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="label-field">Hora salida</label>
                <select className="select-field" value={h.hora_salida} onChange={e => setNuevos(n => n.map((x, j) => j === i ? { ...x, hora_salida: e.target.value } : x))}>
                  <option value="">Seleccioná</option>
                  {HORAS.map(hr => <option key={hr} value={hr}>{hr}</option>)}
                </select>
              </div>
              <button onClick={() => setNuevos(n => n.filter((_, j) => j !== i))} className="btn-danger mb-0.5">✕</button>
            </div>
          ))}
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => setNuevos(n => [...n, { hora_entrada: "", hora_salida: "" }])} className="btn-secondary">+ Otro horario</button>
            <button onClick={guardar} className="btn-primary">Guardar agenda</button>
            <button onClick={() => { setAgregando(false); setNuevos([]); }} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
