"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";

interface Turno {
  id_turno: number;
  hora: string;
  nombre_paciente: string;
  fecha_nacimiento: string;
  nota?: string;
  nota_medico?: string;
  fecha: string;
  estado: string;
  cobertura: string;
}

function calcularEdad(fechaNac: string): number {
  const hoy = new Date();
  const nac = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) edad--;
  return edad;
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

export default function TurnosProgramadosPage() {
  return (
    <ProtectedRoute allowedRole="Medico">
      <TurnosProgramados />
    </ProtectedRoute>
  );
}

function TurnosProgramados() {
  const { user, token } = useAuth();
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [selected, setSelected] = useState<Turno | null>(null);
  const [loading, setLoading] = useState(false);
  const [cambiando, setCambiando] = useState<number | null>(null);
  const [editandoNota, setEditandoNota] = useState<number | null>(null);
  const [notaTexto, setNotaTexto] = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);

  const cargar = async (f: string) => {
    if (!user) return;
    setLoading(true);
    const res = await fetch("/api/turnos/medico", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token! },
      body: JSON.stringify({ id_medico: user.id, fecha: f }),
    });
    const data = await res.json();
    if (data.payload) {
      const sorted = [...data.payload]
        .map((t: Turno) => ({ ...t, hora: t.hora.padStart(5, "0") }))
        .sort((a: Turno, b: Turno) =>
          new Date(`${a.fecha.split("T")[0]}T${a.hora}`).getTime() -
          new Date(`${b.fecha.split("T")[0]}T${b.hora}`).getTime()
        );
      setTurnos(sorted);
    }
    setLoading(false);
  };

  useEffect(() => { cargar(fecha); }, [user, fecha]);

  const abrirNota = (t: Turno) => {
    setEditandoNota(t.id_turno);
    setNotaTexto(t.nota_medico ?? "");
    setSelected(null);
  };

  const guardarNota = async (id: number) => {
    setGuardandoNota(true);
    await fetch(`/api/turnos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: token! },
      body: JSON.stringify({ nota_medico: notaTexto }),
    });
    setGuardandoNota(false);
    setEditandoNota(null);
    cargar(fecha);
  };

  const cambiarEstado = async (id: number, estado: string) => {
    setCambiando(id);
    await fetch(`/api/turnos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: token! },
      body: JSON.stringify({ estado }),
    });
    setCambiando(null);
    setSelected(null);
    cargar(fecha);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="page-title">Turnos Programados</h1>
      <div className="mb-6">
        <label className="label-field">Seleccioná la fecha</label>
        <input type="date" className="input-field max-w-xs" value={fecha} onChange={e => setFecha(e.target.value)} />
      </div>
      {loading ? <p className="text-gray-500">Cargando...</p> : (
        <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="table-header rounded-tl-xl">Hora</th>
                <th className="table-header">Paciente</th>
                <th className="table-header">Edad</th>
                <th className="table-header">Estado</th>
                <th className="table-header rounded-tr-xl">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {turnos.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">No hay turnos para esta fecha</td></tr>
              ) : turnos.map(t => (
                <>
                  <tr key={t.id_turno} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell font-mono">{t.hora}</td>
                    <td className="table-cell">{t.nombre_paciente}</td>
                    <td className="table-cell">{calcularEdad(t.fecha_nacimiento)}</td>
                    <td className="table-cell">{estadoBadge(t.estado ?? "Pendiente")}</td>
                    <td className="table-cell">
                      <div className="flex gap-2 items-center flex-wrap">
                        <button
                          onClick={() => setSelected(selected?.id_turno === t.id_turno ? null : t)}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          {selected?.id_turno === t.id_turno ? "Ocultar" : "Ver notas"}
                        </button>
                        <button
                          onClick={() => abrirNota(t)}
                          className="text-indigo-600 hover:underline text-xs"
                        >
                          {t.nota_medico ? "Editar nota" : "Agregar nota"}
                        </button>
                        {t.estado !== "Confirmado" && t.estado !== "Cancelado" && (
                          <button
                            onClick={() => cambiarEstado(t.id_turno, "Confirmado")}
                            disabled={cambiando === t.id_turno}
                            className="text-xs text-green-700 hover:underline disabled:opacity-50"
                          >
                            Confirmar
                          </button>
                        )}
                        {t.estado !== "Cancelado" && (
                          <button
                            onClick={() => cambiarEstado(t.id_turno, "Cancelado")}
                            disabled={cambiando === t.id_turno}
                            className="text-xs text-red-600 hover:underline disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {selected?.id_turno === t.id_turno && (
                    <tr key={`nota-${t.id_turno}`}>
                      <td colSpan={5} className="px-4 py-3 bg-blue-50 text-sm text-gray-700 border-b">
                        <p><strong>Cobertura:</strong> {t.cobertura}</p>
                        <p><strong>Motivo de consulta:</strong> {t.nota || "Sin notas del paciente."}</p>
                        {t.nota_medico && (
                          <p className="mt-1"><strong>Nota clínica:</strong> {t.nota_medico}</p>
                        )}
                      </td>
                    </tr>
                  )}
                  {editandoNota === t.id_turno && (
                    <tr key={`edit-nota-${t.id_turno}`}>
                      <td colSpan={5} className="px-4 py-3 bg-indigo-50 border-b">
                        <p className="text-xs font-semibold text-indigo-700 mb-2">Nota clínica — {t.nombre_paciente}</p>
                        <textarea
                          className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                          rows={4}
                          placeholder="Diagnóstico, indicaciones, observaciones..."
                          value={notaTexto}
                          onChange={e => setNotaTexto(e.target.value)}
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => guardarNota(t.id_turno)}
                            disabled={guardandoNota}
                            className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50"
                          >
                            {guardandoNota ? "Guardando..." : "Guardar nota"}
                          </button>
                          <button
                            onClick={() => setEditandoNota(null)}
                            className="btn-secondary text-xs px-4 py-1.5"
                          >
                            Cancelar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Link href="/" className="btn-secondary mt-6 inline-block">← Volver al inicio</Link>
    </div>
  );
}
