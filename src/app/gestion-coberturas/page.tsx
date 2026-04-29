"use client";
import { toast } from "@/lib/toast";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";

interface Cobertura { id: number; nombre: string; }

export default function GestionCoberturasPage() {
  return (
    <ProtectedRoute allowedRole="Administrador">
      <GestionCoberturas />
    </ProtectedRoute>
  );
}

function GestionCoberturas() {
  const { token } = useAuth();
  const [coberturas, setCoberturas] = useState<Cobertura[]>([]);
  const [nueva, setNueva] = useState("");
  const [editando, setEditando] = useState<Cobertura | null>(null);

  const cargar = () => fetch("/api/coberturas").then(r => r.json()).then(setCoberturas);
  useEffect(() => { cargar(); }, []);

  const agregar = async () => {
    if (!nueva.trim()) return;
    await fetch("/api/coberturas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre: nueva }) });
    setNueva("");
    cargar();
  };

  const actualizar = async () => {
    if (!editando) return;
    await fetch(`/api/coberturas/${editando.id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: token! }, body: JSON.stringify({ nombre: editando.nombre }) });
    setEditando(null);
    cargar();
  };

  const eliminar = async (id: number) => {
    const res = await fetch(`/api/coberturas/${id}`, { method: "DELETE", headers: { Authorization: token! } });
    const data = await res.json();
    if (!res.ok) { toast(data.message, "error"); return; }
    toast("Cobertura eliminada correctamente");
    cargar();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="page-title">Gestión de Coberturas</h1>
      <div className="card mb-6">
        <h2 className="font-semibold text-gray-700 mb-3">Nueva cobertura</h2>
        <div className="flex gap-3">
          <input className="input-field flex-1" value={nueva} onChange={e => setNueva(e.target.value)} placeholder="Nombre de la cobertura" />
          <button onClick={agregar} className="btn-primary">Agregar</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-100">
        <table className="w-full text-sm">
          <thead><tr><th className="table-header rounded-tl-xl">ID</th><th className="table-header">Nombre</th><th className="table-header rounded-tr-xl">Acciones</th></tr></thead>
          <tbody>
            {coberturas.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="table-cell">{c.id}</td>
                <td className="table-cell">{c.nombre}</td>
                <td className="table-cell flex gap-2">
                  <button onClick={() => setEditando({ ...c })} className="btn-success text-xs">Editar</button>
                  <button onClick={() => eliminar(c.id)} className="btn-danger text-xs">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editando && (
        <div className="card mt-6">
          <h3 className="font-semibold text-gray-700 mb-3">Editar cobertura</h3>
          <div className="flex gap-3">
            <input className="input-field flex-1" value={editando.nombre} onChange={e => setEditando(ed => ({ ...ed!, nombre: e.target.value }))} />
            <button onClick={actualizar} className="btn-primary">Guardar</button>
            <button onClick={() => setEditando(null)} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      )}
      <Link href="/" className="btn-secondary mt-6 inline-block">← Volver al inicio</Link>
    </div>
  );
}
