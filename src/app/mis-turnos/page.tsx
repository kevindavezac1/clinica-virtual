"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ConfirmDialog from "@/components/ConfirmDialog";
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
  nota_medico?: string | null;
  estado?: string;
}

export default function MisTurnosPage() {
  return (
    <ProtectedRoute allowedRole="Paciente">
      <MisTurnos />
    </ProtectedRoute>
  );
}

function estadoBadge(estado?: string, sinRegistrar?: boolean) {
  if (sinRegistrar) {
    return <span className="badge badge-gray">Sin registrar</span>;
  }
  const map: Record<string, string> = {
    Pendiente: "badge-yellow",
    Confirmado: "badge-green",
    Cancelado: "badge-red",
    Realizado: "badge-teal",
    Ausente: "badge-orange",
  };
  const label = estado ?? "Pendiente";
  return <span className={`badge ${map[label] ?? "badge-gray"}`}>{label}</span>;
}

function MisTurnos() {
  const { user, token } = useAuth();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [selected, setSelected] = useState<Turno | null>(null);
  const [tab, setTab] = useState<"proximos" | "historial">("proximos");
  const [loading, setLoading] = useState(true);
  const [cancelando, setCancelando] = useState<number | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<number | null>(null);
  const [filtroEsp, setFiltroEsp] = useState("");
  const [mostrarCancelados, setMostrarCancelados] = useState(false);
  const [paginaHistorial, setPaginaHistorial] = useState(1);
  const POR_PAGINA = 10;

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

  const especialidades = [...new Set(historial.map(t => t.especialidad))].sort();
  const listaFiltrada = tab === "proximos"
    ? proximos
    : historial
        .filter(t => mostrarCancelados || t.estado !== "Cancelado")
        .filter(t => !filtroEsp || t.especialidad === filtroEsp);
  const totalPaginasHistorial = Math.ceil(listaFiltrada.length / POR_PAGINA);
  const lista = tab === "proximos"
    ? listaFiltrada
    : listaFiltrada.slice((paginaHistorial - 1) * POR_PAGINA, paginaHistorial * POR_PAGINA);

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

  const cancelarTurno = async (id: number) => {
    setCancelando(id);
    setConfirmCancel(null);
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

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="text-sm font-medium">Cargando turnos...</span>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="page-title">Mis Turnos</h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setTab("proximos"); setFiltroEsp(""); setPaginaHistorial(1); }}
          className={tab === "proximos" ? "tab-active" : "tab-inactive"}
        >
          Próximos ({proximos.length})
        </button>
        <button
          onClick={() => { setTab("historial"); setFiltroEsp(""); setPaginaHistorial(1); }}
          className={tab === "historial" ? "tab-active" : "tab-inactive"}
        >
          Historial ({historial.length})
        </button>
      </div>

      {tab === "historial" && (
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          {especialidades.length > 1 && (
            <select
              className="select-field max-w-xs"
              value={filtroEsp}
              onChange={e => { setFiltroEsp(e.target.value); setPaginaHistorial(1); }}
            >
              <option value="">Todas las especialidades</option>
              {especialidades.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          )}
          <label className="flex items-center gap-1.5 text-sm text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={mostrarCancelados}
              onChange={e => { setMostrarCancelados(e.target.checked); setPaginaHistorial(1); }}
              className="rounded"
            />
            Ver cancelados
          </label>
        </div>
      )}

      {lista.length === 0 ? (
        <div className="card text-center text-slate-400 py-10">
          {tab === "proximos" ? "No tenés turnos próximos." : "No hay turnos en el historial."}
        </div>
      ) : (
        <ul className="space-y-3">
          {lista.map(turno => (
            <li
              key={turno.id_turno}
              className="card cursor-pointer hover:border-brand-200 hover:shadow-card-md transition-all"
              onClick={() => setSelected(selected?.id_turno === turno.id_turno ? null : turno)}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-800 capitalize">
                  {formatFecha(turno.fecha)} a las {turno.hora}
                </p>
                {estadoBadge(
                  turno.estado,
                  tab === "historial" && (turno.estado === "Pendiente" || turno.estado === "Confirmado")
                )}
              </div>
              {tab === "historial" && (turno.estado === "Pendiente" || turno.estado === "Confirmado") && (
                <p className="text-xs text-slate-400 mt-1">El médico aún no registró si el turno fue asistido o ausente.</p>
              )}

              {selected?.id_turno === turno.id_turno && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-1 text-sm text-slate-700">
                  <p><span className="font-medium">Especialista:</span> {turno.nombre_medico} {turno.apellido_medico}</p>
                  <p><span className="font-medium">Especialidad:</span> {turno.especialidad}</p>
                  {turno.nota && <p><span className="font-medium">Motivo de consulta:</span> {turno.nota}</p>}
                  {tab === "historial" && turno.nota_medico && (
                    <div className="mt-2 p-3 bg-brand-50 rounded-xl">
                      <p className="text-xs font-semibold text-brand-700 mb-1">Nota del médico</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{turno.nota_medico}</p>
                    </div>
                  )}
                  <div className="flex gap-3 mt-3 flex-wrap">
                    {tab === "proximos" && turno.estado !== "Cancelado" && (
                      puedeCancel(turno) ? (
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmCancel(turno.id_turno); }}
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
                      className="text-sm text-brand-700 hover:underline"
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

      {tab === "historial" && totalPaginasHistorial > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
          <button
            onClick={() => setPaginaHistorial(p => Math.max(1, p - 1))}
            disabled={paginaHistorial === 1}
            className="btn-secondary disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span>Página {paginaHistorial} de {totalPaginasHistorial}</span>
          <button
            onClick={() => setPaginaHistorial(p => Math.min(totalPaginasHistorial, p + 1))}
            disabled={paginaHistorial === totalPaginasHistorial}
            className="btn-secondary disabled:opacity-40"
          >
            Siguiente →
          </button>
        </div>
      )}

      <Link href="/" className="btn-secondary mt-6 inline-block">← Volver al inicio</Link>

      {confirmCancel !== null && (
        <ConfirmDialog
          message="¿Confirmás que querés cancelar este turno?"
          confirmLabel="Sí, cancelar"
          cancelLabel="No, volver"
          onConfirm={() => cancelarTurno(confirmCancel)}
          onCancel={() => setConfirmCancel(null)}
        />
      )}
    </div>
  );
}
