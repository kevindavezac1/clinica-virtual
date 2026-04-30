"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";

interface Metrics {
  turnosMes: { total: number; pendientes: number; confirmados: number; cancelados: number };
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

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className={`card border-l-4 ${color}`}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
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

  if (loading) return <p className="text-center py-16 text-gray-400">Cargando métricas...</p>;
  if (!data) return <p className="text-center py-16 text-red-400">Error al cargar el dashboard</p>;

  const maxProx = Math.max(...data.proximos7.map(d => d.cantidad), 1);
  const tasaCancelacion = data.turnosMes.total > 0
    ? Math.round((data.turnosMes.cancelados / data.turnosMes.total) * 100)
    : 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title mb-0">Dashboard</h1>
        <span className="text-sm text-gray-400 capitalize">{mesActual}</span>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Turnos hoy" value={data.turnosHoy} color="border-blue-500" />
        <StatCard label="Turnos del mes" value={data.turnosMes.total} color="border-indigo-500" />
        <StatCard label="Pacientes" value={data.totalPacientes} sub="registrados en total" color="border-teal-500" />
        <StatCard label="Médicos" value={data.totalMedicos} sub="en el sistema" color="border-purple-500" />
      </div>

      {/* Estados del mes + Especialidades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

        {/* Estados */}
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-4">Estados — {mesActual}</h2>
          <div className="space-y-3">
            {[
              { label: "Pendientes", value: data.turnosMes.pendientes, color: "bg-yellow-400", pct: data.turnosMes.total },
              { label: "Confirmados", value: data.turnosMes.confirmados, color: "bg-green-400", pct: data.turnosMes.total },
              { label: "Cancelados", value: data.turnosMes.cancelados, color: "bg-red-400", pct: data.turnosMes.total },
            ].map(({ label, value, color, pct }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-semibold text-gray-800">{value}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`${color} h-2 rounded-full transition-all`} style={{ width: pct > 0 ? `${Math.round((value / pct) * 100)}%` : "0%" }} />
                </div>
              </div>
            ))}
            {tasaCancelacion > 0 && (
              <p className="text-xs text-gray-400 mt-2">Tasa de cancelación: {tasaCancelacion}%</p>
            )}
          </div>
        </div>

        {/* Top especialidades */}
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-4">Especialidades más demandadas</h2>
          {data.topEspecialidades.length === 0 ? (
            <p className="text-sm text-gray-400">Sin datos este mes</p>
          ) : (
            <div className="space-y-3">
              {data.topEspecialidades.map(({ nombre, cantidad }, i) => (
                <div key={nombre} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 truncate">{nombre}</span>
                      <span className="font-semibold text-gray-800 ml-2">{cantidad}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-indigo-400 h-1.5 rounded-full" style={{ width: `${Math.round((cantidad / data.topEspecialidades[0].cantidad) * 100)}%` }} />
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
        <h2 className="font-semibold text-gray-700 mb-4">Turnos — próximos 7 días</h2>
        {data.proximos7.length === 0 ? (
          <p className="text-sm text-gray-400">No hay turnos programados</p>
        ) : (
          <div className="flex items-end gap-2 h-28">
            {data.proximos7.map(({ fecha, cantidad }) => (
              <div key={fecha} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-semibold text-gray-700">{cantidad}</span>
                <div
                  className="w-full bg-blue-500 rounded-t-md transition-all"
                  style={{ height: `${Math.round((cantidad / maxProx) * 80)}px`, minHeight: "4px" }}
                />
                <span className="text-xs text-gray-400 text-center capitalize leading-tight">{formatFecha(fecha)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link href="/" className="btn-secondary inline-block">← Volver al inicio</Link>
    </div>
  );
}
