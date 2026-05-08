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
    Pendiente: "bg-yellow-100 text-yellow-800",
    Confirmado: "bg-green-100 text-green-800",
    Realizado: "bg-teal-100 text-teal-800",
    Ausente: "bg-orange-100 text-orange-700",
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
        {loadingPacientes && <p className="text-xs text-gray-400 mt-1">Buscando...</p>}
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
                  {p.datos_verificados
                    ? <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Verificado</span>
                    : <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Sin verificar</span>}
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
                <h2 className="text-lg font-bold text-gray-800">
                  {pacienteSeleccionado.apellido}, {pacienteSeleccionado.nombre}
                </h2>
                {pacienteSeleccionado.datos_verificados
                  ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Datos verificados</span>
                  : <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Sin verificar</span>}
              </div>
              <p className="text-sm text-gray-400">DNI {pacienteSeleccionado.dni} · {pacienteSeleccionado.nombre_cobertura ?? "Sin cobertura"}</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer">
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
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                ✕ Cambiar
              </button>
            </div>
          </div>

          {loadingHistorial ? (
            <p className="text-gray-400 text-sm">Cargando historial...</p>
          ) : historial.length === 0 ? (
            <div className="card text-center py-8 text-gray-400 text-sm">
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
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-gray-700">Nota clínica:</p>
                          {user?.rol === "Medico" && editandoNota !== entrada.id_turno && (
                            <button
                              onClick={() => abrirEditarNota(entrada)}
                              className="text-xs text-indigo-600 hover:underline"
                            >
                              {entrada.nota_medico ? "Editar" : "+ Agregar nota"}
                            </button>
                          )}
                        </div>

                        {editandoNota === entrada.id_turno ? (
                          <div>
                            <textarea
                              className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
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

          {Math.ceil(historial.length / POR_PAGINA) > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
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
