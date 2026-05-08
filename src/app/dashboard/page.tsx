"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";

interface Metrics {
  turnosMes: { total: number; pendientes: number; confirmados: number; cancelados: number; realizados: number; ausentes: number };
  turnosHoy: number;
  totalPacientes: number;
  totalMedicos: number;
  topEspecialidades: { nombre: string; cantidad: number }[];
  proximos7: { fecha: string; cantidad: number }[];
}

export default function DashboardPage() {
  return (
    <ProtectedRoute allowedRole="Administrador">
      <Dashboard />
    </ProtectedRoute>
  );
}

function StatCard({ label, value, sub, icon }: { label: string; value: number | string; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="card flex items-start gap-4">
      <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function Dashboard() {
  const { token } = useAuth();
  const [data, setData] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard", { headers: { Authorization: token! } })
      .then(r => r.json())
      .then(d => { if (d.payload) setData(d.payload); })
      .finally(() => setLoading(false));
  }, [token]);

  const mesActual = new Date().toLocaleDateString("es-AR", {
    month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires",
  });

  const formatFecha = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("es-AR", {
      weekday: "short", day: "numeric", month: "short",
      timeZone: "America/Argentina/Buenos_Aires",
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="text-sm font-medium">Cargando métricas...</span>
    </div>
  );
  if (!data) return <p className="text-center py-16 text-red-500 text-sm">Error al cargar el dashboard.</p>;

  const maxProx = Math.max(...data.proximos7.map(d => d.cantidad), 1);
  const tasaCancelacion = data.turnosMes.total > 0
    ? Math.round((data.turnosMes.cancelados / data.turnosMes.total) * 100)
    : 0;
  const totalCerrados = data.turnosMes.realizados + data.turnosMes.ausentes;
  const tasaAsistencia = totalCerrados > 0
    ? Math.round((data.turnosMes.realizados / totalCerrados) * 100)
    : null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title mb-0">Dashboard</h1>
        <span className="text-sm text-slate-400 capitalize">{mesActual}</span>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Turnos hoy" value={data.turnosHoy}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatCard label="Turnos del mes" value={data.turnosMes.total}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>} />
        <StatCard label="Pacientes" value={data.totalPacientes} sub="registrados en total"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>} />
        <StatCard label="Médicos" value={data.totalMedicos} sub="en el sistema"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>} />
      </div>

      {/* Estados del mes + Especialidades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

        {/* Estados */}
        <div className="card">
          <h2 className="font-semibold text-slate-700 mb-4">Estados — {mesActual}</h2>
          <div className="space-y-3">
            {[
              { label: "Pendientes", value: data.turnosMes.pendientes, color: "bg-yellow-400" },
              { label: "Confirmados", value: data.turnosMes.confirmados, color: "bg-green-400" },
              { label: "Realizados", value: data.turnosMes.realizados, color: "bg-teal-400" },
              { label: "Ausentes", value: data.turnosMes.ausentes, color: "bg-orange-400" },
              { label: "Cancelados", value: data.turnosMes.cancelados, color: "bg-red-400" },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-semibold text-slate-800">{value}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div className={`${color} h-2.5 rounded-full transition-all`} style={{ width: data.turnosMes.total > 0 ? `${Math.round((value / data.turnosMes.total) * 100)}%` : "0%" }} />
                </div>
              </div>
            ))}
            <div className="flex gap-4 mt-2">
              {tasaCancelacion > 0 && <p className="text-xs text-slate-400">Cancelación: {tasaCancelacion}%</p>}
              {tasaAsistencia !== null && <p className="text-xs text-teal-600 font-medium">Asistencia: {tasaAsistencia}%</p>}
            </div>
          </div>
        </div>

        {/* Top especialidades */}
        <div className="card">
          <h2 className="font-semibold text-slate-700 mb-4">Especialidades más demandadas</h2>
          {data.topEspecialidades.length === 0 ? (
            <p className="text-sm text-slate-400">Sin datos este mes</p>
          ) : (
            <div className="space-y-3">
              {data.topEspecialidades.map(({ nombre, cantidad }, i) => (
                <div key={nombre} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700 truncate">{nombre}</span>
                      <span className="font-semibold text-slate-800 ml-2">{cantidad}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${Math.round((cantidad / data.topEspecialidades[0].cantidad) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Próximos 7 días */}
      <div className="card mb-6">
        <h2 className="font-semibold text-slate-700 mb-5">Turnos — próximos 7 días</h2>
        {data.proximos7.length === 0 ? (
          <p className="text-sm text-slate-400">No hay turnos programados</p>
        ) : (
          <div className="flex items-end gap-1.5" style={{ height: "120px" }}>
            {data.proximos7.map(({ fecha, cantidad }) => {
              const pct = Math.round((cantidad / maxProx) * 100);
              const esHoy = fecha === new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
              return (
                <div key={fecha} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                  {cantidad > 0 && (
                    <span className="text-xs font-bold text-slate-600">{cantidad}</span>
                  )}
                  <div className="w-full flex flex-col justify-end" style={{ height: "72px" }}>
                    <div
                      className={`w-full rounded-t transition-all ${esHoy ? "bg-brand-700" : "bg-brand-300"}`}
                      style={{ height: cantidad > 0 ? `${Math.max(pct * 0.72, 4)}px` : "2px", opacity: cantidad > 0 ? 1 : 0.3 }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 text-center capitalize leading-tight w-full truncate px-0.5">
                    {formatFecha(fecha)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Link href="/" className="btn-secondary inline-block">← Volver al inicio</Link>
    </div>
  );
}
