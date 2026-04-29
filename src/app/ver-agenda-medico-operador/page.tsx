"use client";

import { useEffect, useState } from "react";
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

function estadoBadge(estado: string) {
  const map: Record<string, string> = {
    Pendiente: "bg-yellow-100 text-yellow-800",
    Confirmado: "bg-green-100 text-green-800",
    Cancelado: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[estado] ?? "bg-gray-100 text-gray-600"}`}>
      {estado}
    </span>
  );
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
  const [fecha, setFecha] = useState(new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }));
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroMedico, setFiltroMedico] = useState("");
  const [medicos, setMedicos] = useState<string[]>([]);

  const cargar = async (f: string) => {
    setLoading(true);
    setTurnos([]);
    const res = await fetch(`/api/turnos?fecha=${f}`, {
      headers: { Authorization: token! },
    }).then(r => r.json());
    if (res.payload) {
      const data: Turno[] = res.payload.map((t: Turno) => ({ ...t, hora: t.hora.padStart(5, "0") }));
      setTurnos(data);
      const medicosUnicos = [...new Set(data.map(t => t.nombre_medico))].sort();
      setMedicos(medicosUnicos);
    }
    setLoading(false);
  };

  useEffect(() => { cargar(fecha); }, [token, fecha]);

  const filtrados = turnos.filter(t => {
    const q = busqueda.toLowerCase();
    const coincideBusqueda = !q ||
      t.nombre_paciente.toLowerCase().includes(q) ||
      t.nombre_medico.toLowerCase().includes(q) ||
      t.especialidad.toLowerCase().includes(q);
    const coincideEstado = !filtroEstado || t.estado === filtroEstado;
    const coincideMedico = !filtroMedico || t.nombre_medico === filtroMedico;
    return coincideBusqueda && coincideEstado && coincideMedico;
  });

  const limpiar = () => { setBusqueda(""); setFiltroEstado(""); setFiltroMedico(""); };
  const hayFiltros = busqueda || filtroEstado || filtroMedico;

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="page-title">Gestión de Turnos</h1>

      <div className="mb-5 flex flex-wrap gap-3 items-center">
        <div>
          <label className="label-field">Fecha</label>
          <input type="date" className="input-field max-w-xs" value={fecha} onChange={e => setFecha(e.target.value)} />
        </div>
      </div>

      <div className="card mb-5 flex flex-wrap gap-3 items-center">
        <input
          className="input-field flex-1 min-w-[200px]"
          placeholder="Buscar paciente, médico o especialidad..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <select className="select-field max-w-[180px]" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {["Pendiente", "Confirmado", "Cancelado"].map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <select className="select-field max-w-[200px]" value={filtroMedico} onChange={e => setFiltroMedico(e.target.value)}>
          <option value="">Todos los médicos</option>
          {medicos.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        {hayFiltros && <button onClick={limpiar} className="btn-secondary whitespace-nowrap">Limpiar</button>}
        <span className="text-sm text-gray-400 whitespace-nowrap">{filtrados.length} turno{filtrados.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? <p className="text-gray-500">Cargando...</p> : (
        <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-header">Hora</th>
                <th className="table-header">Médico</th>
                <th className="table-header">Especialidad</th>
                <th className="table-header">Paciente</th>
                <th className="table-header">Cobertura</th>
                <th className="table-header rounded-tr-xl">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No hay turnos para esta fecha</td></tr>
              ) : filtrados.map(t => (
                <tr key={t.id_turno} className="hover:bg-gray-50">
                  <td className="table-cell font-mono">{t.hora}</td>
                  <td className="table-cell">{t.nombre_medico}</td>
                  <td className="table-cell">{t.especialidad}</td>
                  <td className="table-cell">{t.nombre_paciente}</td>
                  <td className="table-cell">{t.cobertura}</td>
                  <td className="table-cell">{estadoBadge(t.estado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
