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
  nombre_cobertura: string | null;
  datos_verificados: boolean;
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
    Pendiente: "badge-yellow",
    Confirmado: "badge-green",
    Realizado: "badge-teal",
    Ausente: "badge-orange",
    Cancelado: "badge-red",
  };
  return <span className={`badge ${map[estado] ?? "badge-gray"}`}>{estado}</span>;
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
    <ProtectedRoute allowedRole={["Medico", "Operador"]}>
      <HistorialPaciente />
    </ProtectedRoute>
  );
}

function HistorialPaciente() {
  const { token, user } = useAuth();

  const [busqueda, setBusqueda] = useState("");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<Paciente | null>(null);
  const [historial, setHistorial] = useState<EntradaHistorial[]>([]);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [expandido, setExpandido] = useState<number | null>(null);
  const [editandoNota, setEditandoNota] = useState<number | null>(null);
  const [notaTexto, setNotaTexto] = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [mostrarCancelados, setMostrarCancelados] = useState(false);
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 15;

  useEffect(() => {
    if (busqueda.length < 2) { setPacientes([]); return; }
    const t = setTimeout(async () => {
      setLoadingPacientes(true);
      const params = new URLSearchParams({ q: busqueda, rol: "Paciente", limit: "8" });
      const res = await fetch(`/api/usuarios?${params}`, { headers: { Authorization: token! } });
      const data = await res.json();
      if (data.payload) setPacientes(data.payload as Paciente[]);
      setLoadingPacientes(false);
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda, token]);

  const cargarHistorial = async (p: Paciente, conCancelados = mostrarCancelados) => {
    setLoadingHistorial(true);
    const url = `/api/historial/paciente/${p.id}${conCancelados ? "?cancelados=1" : ""}`;
    const res = await fetch(url, { headers: { Authorization: token! } });
    const data = await res.json();
    if (data.payload) setHistorial(data.payload);
    setLoadingHistorial(false);
  };

  const toggleCancelados = (val: boolean) => {
    setMostrarCancelados(val);
    setPagina(1);
    if (pacienteSeleccionado) cargarHistorial(pacienteSeleccionado, val);
  };

  const seleccionarPaciente = async (p: Paciente) => {
    setPacienteSeleccionado(p);
    setBusqueda("");
    setPacientes([]);
    setEditandoNota(null);
    setPagina(1);
    await cargarHistorial(p);
  };

  const abrirEditarNota = (entrada: EntradaHistorial) => {
    setEditandoNota(entrada.id_turno);
    setNotaTexto(entrada.nota_medico ?? "");
    setExpandido(entrada.id_turno);
  };

  const guardarNota = async (idTurno: number) => {
    setGuardandoNota(true);
    await fetch(`/api/turnos/${idTurno}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: token! },
      body: JSON.stringify({ nota_medico: notaTexto }),
    });
    setGuardandoNota(false);
    setEditandoNota(null);
    if (pacienteSeleccionado) await cargarHistorial(pacienteSeleccionado);
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
        {loadingPacientes && <p className="text-xs text-slate-400 mt-1">Buscando...</p>}
        {pacientes.length > 0 && (
          <ul className="absolute z-10 w-full bg-white border border-slate-200 rounded-xl shadow-lg mt-1 divide-y divide-slate-100">
            {pacientes.map(p => (
              <li key={p.id}>
                <button
                  onClick={() => seleccionarPaciente(p)}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm transition-colors"
                >
                  <span className="font-semibold text-slate-800">{p.apellido}, {p.nombre}</span>
                  <span className="ml-2 text-slate-400 text-xs">DNI {p.dni}</span>
                  {p.datos_verificados
                    ? <span className="badge badge-green ml-2">Verificado</span>
                    : <span className="badge badge-yellow ml-2">Sin verificar</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Paciente seleccionado */}
      {pacienteSeleccionado && (
        <div>
          <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-800">
                  {pacienteSeleccionado.apellido}, {pacienteSeleccionado.nombre}
                </h2>
                {pacienteSeleccionado.datos_verificados
                  ? <span className="badge badge-green">Datos verificados</span>
                  : <span className="badge badge-yellow">Sin verificar</span>}
              </div>
              <p className="text-sm text-slate-400">DNI {pacienteSeleccionado.dni} · {pacienteSeleccionado.nombre_cobertura ?? "Sin cobertura"}</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-sm text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mostrarCancelados}
                  onChange={e => toggleCancelados(e.target.checked)}
                  className="rounded"
                />
                Ver cancelados
              </label>
              <button
                onClick={() => { setPacienteSeleccionado(null); setHistorial([]); setMostrarCancelados(false); }}
                className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕ Cambiar
              </button>
            </div>
          </div>

          {loadingHistorial ? (
            <div className="flex items-center gap-3 py-6 text-slate-400">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">Cargando historial...</span>
            </div>
          ) : historial.length === 0 ? (
            <div className="card text-center py-8 text-slate-400 text-sm">
              Sin turnos registrados para este paciente.
            </div>
          ) : (
            <div className="space-y-3">
              {historial.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA).map(entrada => (
                <div key={entrada.id_turno} className="card">
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => {
                      if (editandoNota === entrada.id_turno) return;
                      setExpandido(expandido === entrada.id_turno ? null : entrada.id_turno);
                    }}
                  >
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">
                        {formatFecha(entrada.fecha)} — {entrada.hora}
                      </p>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {entrada.especialidad} · {entrada.medico}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      {estadoBadge(entrada.estado)}
                      {entrada.nota_medico && (
                        <span className="badge badge-blue">
                          Nota médica
                        </span>
                      )}
                      <span className="text-slate-400 text-xs">{expandido === entrada.id_turno ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {expandido === entrada.id_turno && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-sm">
                      <p className="text-slate-500"><span className="font-medium text-slate-700">Cobertura:</span> {entrada.cobertura}</p>
                      {entrada.nota_paciente && (
                        <p className="text-slate-500">
                          <span className="font-medium text-slate-700">Motivo de consulta:</span> {entrada.nota_paciente}
                        </p>
                      )}
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-slate-700">Nota clínica:</p>
                          {user?.rol === "Medico" && editandoNota !== entrada.id_turno && (
                            <button
                              onClick={() => abrirEditarNota(entrada)}
                              className="text-xs text-brand-700 hover:text-brand-900 font-medium transition-colors"
                            >
                              {entrada.nota_medico ? "Editar" : "+ Agregar nota"}
                            </button>
                          )}
                        </div>

                        {editandoNota === entrada.id_turno ? (
                          <div>
                            <textarea
                              className="w-full border border-brand-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
                              rows={4}
                              placeholder="Diagnóstico, indicaciones, observaciones..."
                              value={notaTexto}
                              onChange={e => setNotaTexto(e.target.value)}
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => guardarNota(entrada.id_turno)}
                                disabled={guardandoNota}
                                className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50"
                              >
                                {guardandoNota ? "Guardando..." : "Guardar"}
                              </button>
                              <button
                                onClick={() => setEditandoNota(null)}
                                className="btn-secondary text-xs px-4 py-1.5"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : entrada.nota_medico ? (
                          <p className="text-slate-700 bg-brand-50 rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap">
                            {entrada.nota_medico}
                          </p>
                        ) : (
                          <p className="text-slate-400 italic text-xs">Sin nota clínica registrada.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {Math.ceil(historial.length / POR_PAGINA) > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
              <button
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="btn-secondary disabled:opacity-40"
              >
                ← Anterior
              </button>
              <span>Página {pagina} de {Math.ceil(historial.length / POR_PAGINA)}</span>
              <button
                onClick={() => setPagina(p => Math.min(Math.ceil(historial.length / POR_PAGINA), p + 1))}
                disabled={pagina === Math.ceil(historial.length / POR_PAGINA)}
                className="btn-secondary disabled:opacity-40"
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      )}

      <Link href="/" className="btn-secondary mt-6 inline-block">← Volver al inicio</Link>
    </div>
  );
}
