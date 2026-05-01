"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";

interface Paciente {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
}

interface EntradaHistorial {
  id_turno: number;
  fecha: string;
  hora: string;
  estado: string;
  nota_paciente: string | null;
  nota_medico: string | null;
  medico: string;
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

function formatFecha(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("es-AR", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export default function HistorialPacientePage() {
  return (
    <ProtectedRoute allowedRole={["Medico", "Administrador"]}>
      <HistorialPaciente />
    </ProtectedRoute>
  );
}

function HistorialPaciente() {
  const { token } = useAuth();
  const [busqueda, setBusqueda] = useState("");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<Paciente | null>(null);
  const [historial, setHistorial] = useState<EntradaHistorial[]>([]);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [expandido, setExpandido] = useState<number | null>(null);

  useEffect(() => {
    if (busqueda.length < 2) { setPacientes([]); return; }
    const t = setTimeout(async () => {
      setLoadingPacientes(true);
      const res = await fetch("/api/usuarios", { headers: { Authorization: token! } });
      const data = await res.json();
      if (data.payload) {
        const q = busqueda.toLowerCase();
        setPacientes(
          (data.payload as Paciente[])
            .filter((u: Paciente & { rol?: string }) =>
              u.rol === "Paciente" &&
              (`${u.nombre} ${u.apellido}`.toLowerCase().includes(q) || u.dni?.toLowerCase().includes(q))
            )
            .slice(0, 8)
        );
      }
      setLoadingPacientes(false);
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda, token]);

  const seleccionarPaciente = async (p: Paciente) => {
    setPacienteSeleccionado(p);
    setBusqueda("");
    setPacientes([]);
    setLoadingHistorial(true);
    const res = await fetch(`/api/historial/paciente/${p.id}`, { headers: { Authorization: token! } });
    const data = await res.json();
    if (data.payload) setHistorial(data.payload);
    setLoadingHistorial(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="page-title">Historial Clínico</h1>

      {/* Buscador */}
      <div className="relative mb-6">
        <label className="label-field">Buscar paciente por nombre o DNI</label>
        <input
          type="text"
          className="input-field"
          placeholder="Ej: García, 12345678..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        {loadingPacientes && (
          <p className="text-xs text-gray-400 mt-1">Buscando...</p>
        )}
        {pacientes.length > 0 && (
          <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 divide-y divide-gray-100">
            {pacientes.map(p => (
              <li key={p.id}>
                <button
                  onClick={() => seleccionarPaciente(p)}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm"
                >
                  <span className="font-semibold text-gray-800">{p.apellido}, {p.nombre}</span>
                  <span className="ml-2 text-gray-400 text-xs">DNI {p.dni}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Historial del paciente seleccionado */}
      {pacienteSeleccionado && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                {pacienteSeleccionado.apellido}, {pacienteSeleccionado.nombre}
              </h2>
              <p className="text-sm text-gray-400">DNI {pacienteSeleccionado.dni}</p>
            </div>
            <button
              onClick={() => { setPacienteSeleccionado(null); setHistorial([]); }}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              ✕ Cambiar paciente
            </button>
          </div>

          {loadingHistorial ? (
            <p className="text-gray-400 text-sm">Cargando historial...</p>
          ) : historial.length === 0 ? (
            <div className="card text-center py-8 text-gray-400 text-sm">
              Sin turnos registrados para este paciente.
            </div>
          ) : (
            <div className="space-y-3">
              {historial.map(entrada => (
                <div key={entrada.id_turno} className="card">
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => setExpandido(expandido === entrada.id_turno ? null : entrada.id_turno)}
                  >
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">
                        {formatFecha(entrada.fecha)} — {entrada.hora}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {entrada.especialidad} · {entrada.medico}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      {estadoBadge(entrada.estado)}
                      {entrada.nota_medico && (
                        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                          Nota médica
                        </span>
                      )}
                      <span className="text-gray-400 text-xs">{expandido === entrada.id_turno ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {expandido === entrada.id_turno && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-sm">
                      <p className="text-gray-500"><span className="font-medium text-gray-700">Cobertura:</span> {entrada.cobertura}</p>
                      {entrada.nota_paciente && (
                        <p className="text-gray-500">
                          <span className="font-medium text-gray-700">Motivo de consulta:</span> {entrada.nota_paciente}
                        </p>
                      )}
                      <div className="mt-2">
                        <p className="font-medium text-gray-700 mb-1">Nota clínica del médico:</p>
                        {entrada.nota_medico ? (
                          <p className="text-gray-700 bg-indigo-50 rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap">
                            {entrada.nota_medico}
                          </p>
                        ) : (
                          <p className="text-gray-400 italic text-xs">Sin nota clínica registrada.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Link href="/" className="btn-secondary mt-6 inline-block">← Volver al inicio</Link>
    </div>
  );
}
