"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";
import { toast } from "@/lib/toast";

interface Feriado {
  id: number | null;
  fecha: string;
  descripcion: string;
  fuente: "nacional" | "local";
}

function formatFecha(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export default function GestionFeriadosPage() {
  return (
    <ProtectedRoute allowedRole="Administrador">
      <GestionFeriados />
    </ProtectedRoute>
  );
}

function GestionFeriados() {
  const { token } = useAuth();
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ fecha: "", descripcion: "" });
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    setLoading(true);
    const res = await fetch("/api/feriados", { headers: { Authorization: token! } });
    const data = await res.json();
    if (data.payload) setFeriados(data.payload);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, [token]);

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    const res = await fetch("/api/feriados", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token! },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.codigo === 200) {
      toast("Cierre agregado");
      setForm({ fecha: "", descripcion: "" });
      cargar();
    } else {
      toast(data.error || "Error al agregar", "error");
    }
    setGuardando(false);
  };

  const eliminar = async (id: number) => {
    await fetch(`/api/feriados/${id}`, { method: "DELETE", headers: { Authorization: token! } });
    setFeriados(prev => prev.filter(f => f.id !== id));
    toast("Cierre eliminado");
  };

  const today = new Date().toISOString().split("T")[0];
  const nacionales = feriados.filter(f => f.fuente === "nacional" && f.fecha >= today);
  const locales = feriados.filter(f => f.fuente === "local");

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="page-title">Días No Laborables</h1>
      <p className="text-sm text-slate-500 mb-6">
        Los feriados nacionales se cargan automáticamente. Agregá cierres especiales del consultorio (vacaciones, refacciones, etc.).
      </p>

      {/* Agregar cierre especial */}
      <form onSubmit={agregar} className="card mb-6">
        <p className="text-sm font-semibold text-slate-700 mb-3">Agregar cierre especial</p>
        <div className="flex gap-3">
          <div className="shrink-0">
            <input
              type="date"
              className="input-field"
              value={form.fecha}
              onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
              required
            />
          </div>
          <div className="flex-1">
            <input
              type="text"
              className="input-field"
              placeholder="Motivo (ej: Capacitación del personal)"
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              required
              maxLength={150}
            />
          </div>
          <button type="submit" disabled={guardando} className="btn-primary shrink-0 disabled:opacity-50">
            Agregar
          </button>
        </div>
      </form>

      {loading ? (
        <div className="flex items-center gap-3 py-6 text-slate-400">
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Cargando...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Cierres especiales */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Cierres especiales ({locales.length})
            </p>
            {locales.length === 0 ? (
              <div className="card text-center py-6 text-slate-400 text-sm">
                No hay cierres especiales cargados.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl shadow-sm border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="table-header rounded-tl-xl">Fecha</th>
                      <th className="table-header">Descripción</th>
                      <th className="table-header rounded-tr-xl">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locales.map(f => (
                      <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                        <td className="table-cell font-mono text-xs whitespace-nowrap capitalize">{formatFecha(f.fecha)}</td>
                        <td className="table-cell">{f.descripcion}</td>
                        <td className="table-cell">
                          <button onClick={() => eliminar(f.id!)} className="text-red-500 hover:text-red-700 text-xs font-medium transition-colors">
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Feriados nacionales (solo lectura) */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Feriados nacionales 2025–2026 (automáticos)
            </p>
            <div className="overflow-x-auto rounded-xl shadow-sm border border-slate-200 opacity-70">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="table-header rounded-tl-xl">Fecha</th>
                    <th className="table-header rounded-tr-xl">Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {nacionales.map(f => (
                    <tr key={f.fecha} className="hover:bg-slate-50 transition-colors">
                      <td className="table-cell font-mono text-xs whitespace-nowrap capitalize">{formatFecha(f.fecha)}</td>
                      <td className="table-cell">{f.descripcion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Link href="/" className="btn-secondary mt-6 inline-block">← Volver al inicio</Link>
    </div>
  );
}
