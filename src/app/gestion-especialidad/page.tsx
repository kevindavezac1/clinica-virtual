"use client";
import { toast } from "@/lib/toast";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";

interface Especialidad { id: number; descripcion: string; }

export default function GestionEspecialidadPage() {
  return (
    <ProtectedRoute allowedRole="Administrador">
      <GestionEspecialidades />
    </ProtectedRoute>
  );
}

function GestionEspecialidades() {
  const { token } = useAuth();
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [nueva, setNueva] = useState("");
  const [editando, setEditando] = useState<Especialidad | null>(null);

  const cargar = () =>
    fetch("/api/especialidades", { headers: { Authorization: token! } })
      .then(r => r.json())
      .then(d => { if (d.payload) setEspecialidades(d.payload); });

  useEffect(() => { cargar(); }, [token]);

  const agregar = async () => {
    if (!nueva.trim()) return;
    await fetch("/api/especialidades", { method: "POST", headers: { "Content-Type": "application/json", Authorization: token! }, body: JSON.stringify({ descripcion: nueva }) });
    setNueva("");
    cargar();
  };

  const actualizar = async () => {
    if (!editando) return;
    await fetch(`/api/especialidades/${editando.id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: token! }, body: JSON.stringify({ descripcion: editando.descripcion }) });
    setEditando(null);
    cargar();
  };

  const eliminar = async (id: number) => {
    const res = await fetch(`/api/especialidades/${id}`, { method: "DELETE", headers: { Authorization: token! } });
    const data = await res.json();
    if (!res.ok) { toast(data.message, "error"); return; }
    toast("Especialidad eliminada correctamente");
    cargar();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="page-title">Gestión de Especialidades</h1>
      <div className="card mb-6">
        <h2 className="font-semibold text-gray-700 mb-3">Nueva especialidad</h2>
        <div className="flex gap-3">
          <input className="input-field flex-1" value={nueva} onChange={e => setNueva(e.target.value)} placeholder="Nombre de la especialidad" />
          <button onClick={agregar} className="btn-primary">Agregar</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-100">
        <table className="w-full text-sm">
          <thead><tr><th className="table-header rounded-tl-xl">ID</th><th className="table-header">Descripción</th><th className="table-header rounded-tr-xl">Acciones</th></tr></thead>
          <tbody>
            {especialidades.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="table-cell">{e.id}</td>
                <td className="table-cell">{e.descripcion}</td>
                <td className="table-cell flex gap-2">
                  <button onClick={() => setEditando({ ...e })} className="btn-success text-xs">Editar</button>
                  <button onClick={() => eliminar(e.id)} className="btn-danger text-xs">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editando && (
        <div className="card mt-6">
          <h3 className="font-semibold text-gray-700 mb-3">Editar especialidad</h3>
          <div className="flex gap-3">
            <input className="input-field flex-1" value={editando.descripcion} onChange={e => setEditando(ed => ({ ...ed!, descripcion: e.target.value }))} />
            <button onClick={actualizar} className="btn-primary">Guardar</button>
            <button onClick={() => setEditando(null)} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      )}
      <Link href="/" className="btn-secondary mt-6 inline-block">← Volver al inicio</Link>
    </div>
  );
}
