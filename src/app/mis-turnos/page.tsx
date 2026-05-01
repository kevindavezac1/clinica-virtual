"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";
import { toast } from "@/lib/toast";

interface Turno {
  id_turno: number;
  fecha: string;
  hora: string;
  nombre_medico: string;
  apellido_medico: string;
  especialidad: string;
  nota?: string;
  estado?: string;
}

export default function MisTurnosPage() {
  return (
    <ProtectedRoute allowedRole="Paciente">
      <MisTurnos />
    </ProtectedRoute>
  );
}

function estadoBadge(estado?: string) {
  const map: Record<string, string> = {
    Pendiente: "bg-yellow-100 text-yellow-800",
    Confirmado: "bg-green-100 text-green-800",
    Cancelado: "bg-red-100 text-red-700",
  };
  const label = estado ?? "Pendiente";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[label] ?? "bg-gray-100 text-gray-600"}`}>
      {label}
    </span>
  );
}

function MisTurnos() {
  const { user, token } = useAuth();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [selected, setSelected] = useState<Turno | null>(null);
  const [tab, setTab] = useState<"proximos" | "historial">("proximos");
  const [loading, setLoading] = useState(true);
  const [cancelando, setCancelando] = useState<number | null>(null);

  const cargarTurnos = () => {
    if (!user) return;
    setLoading(true);
    fetch(`/api/turnos/paciente/${user.id}`, {
      headers: { Authorization: token! },
    })
      .then(r => r.json())
      .then(data => {
        if (data.codigo === 200) {
          setTurnos(
            (data.payload as Turno[]).map(t => ({ ...t, hora: t.hora.padStart(5, "0") }))
          );
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargarTurnos(); }, [user, token]);

  const now = Date.now();

  // Interpreta la fecha y hora del turno siempre en timezone Argentina (UTC-3)
  const turnoMs = (t: Turno) =>
    new Date(`${t.fecha.split("T")[0]}T${t.hora}:00-03:00`).getTime();

  const proximos = turnos
    .filter(t => {
      const cancelado = t.estado === "Cancelado";
      const futuro = turnoMs(t) >= now;
      return futuro && !cancelado;
    })
    .sort((a, b) => turnoMs(a) - turnoMs(b));

  const historial = turnos
    .filter(t => {
      const cancelado = t.estado === "Cancelado";
      const pasado = turnoMs(t) < now;
      return pasado || cancelado;
    })
    .sort((a, b) => turnoMs(b) - turnoMs(a));

  const lista = tab === "proximos" ? proximos : historial;

  // Muestra la fecha como "miércoles, 30 de abril de 2026" siempre en timezone Argentina
  const formatFecha = (iso: string) => {
    const [y, m, d] = iso.split("T")[0].split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("es-AR", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      timeZone: "America/Argentina/Buenos_Aires",
    });
  };

  const puedeCancel = (t: Turno) => {
    const turnoMs2 = new Date(`${t.fecha.split("T")[0]}T${t.hora}:00-03:00`).getTime();
    return (turnoMs2 - Date.now()) >= 24 * 3_600_000;
  };

  const cancelarTurno = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Confirmás que querés cancelar este turno?")) return;
    setCancelando(id);
    const res = await fetch(`/api/turnos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: token! },
      body: JSON.stringify({ estado: "Cancelado" }),
    });
    const data = await res.json();
    setCancelando(null);
    if (data.codigo === 200) {
      toast("Turno cancelado correctamente");
      setSelected(null);
      cargarTurnos();
    } else {
      toast(data.mensaje || "No se pudo cancelar el turno", "error");
    }
  };

  if (loading) return <p className="text-center py-12 text-gray-500">Cargando turnos...</p>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="page-title">Mis Turnos</h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("proximos")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "proximos" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          Próximos ({proximos.length})
        </button>
        <button
          onClick={() => setTab("historial")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "historial" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          Historial ({historial.length})
        </button>
      </div>

      {lista.length === 0 ? (
        <div className="card text-center text-gray-500 py-10">
          {tab === "proximos" ? "No tenés turnos próximos." : "No hay turnos en el historial."}
        </div>
      ) : (
        <ul className="space-y-3">
          {lista.map(turno => (
            <li
              key={turno.id_turno}
              className="card cursor-pointer hover:border-blue-300 transition-all"
              onClick={() => setSelected(selected?.id_turno === turno.id_turno ? null : turno)}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-800 capitalize">
                  {formatFecha(turno.fecha)} a las {turno.hora}
                </p>
                {estadoBadge(turno.estado)}
              </div>

              {selected?.id_turno === turno.id_turno && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-1 text-sm text-gray-700">
                  <p><span className="font-medium">Especialista:</span> {turno.nombre_medico} {turno.apellido_medico}</p>
                  <p><span className="font-medium">Especialidad:</span> {turno.especialidad}</p>
                  {turno.nota && <p><span className="font-medium">Nota:</span> {turno.nota}</p>}
                  <div className="flex gap-3 mt-3 flex-wrap">
                    {tab === "proximos" && turno.estado !== "Cancelado" && (
                      puedeCancel(turno) ? (
                        <button
                          onClick={e => cancelarTurno(turno.id_turno, e)}
                          disabled={cancelando === turno.id_turno}
                          className="text-sm text-red-600 hover:underline disabled:opacity-50"
                        >
                          {cancelando === turno.id_turno ? "Cancelando..." : "Cancelar turno"}
                        </button>
                      ) : (
                        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 leading-snug">
                          Para cancelar con menos de 24hs llamá al consultorio:<br />
                          <span className="font-semibold">+54 3496 417428</span>
                        </p>
                      )
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); setSelected(null); }}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Link href="/" className="btn-secondary mt-6 inline-block">← Volver al inicio</Link>
    </div>
  );
}
