"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Usuario {
  id: number; dni: string; nombre: string; apellido: string; rol: string;
  nombre_cobertura: string; telefono: string; email: string; id_cobertura: number;
}
interface Cobertura { id: number; nombre: string; }

export default function ListarUsuariosPage() {
  return (
    <ProtectedRoute allowedRole="Administrador">
      <ListarUsuarios />
    </ProtectedRoute>
  );
}

function ListarUsuarios() {
  const { token } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [coberturas, setCoberturas] = useState<Cobertura[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("");
  const [editando, setEditando] = useState<Usuario | null>(null);

  const cargar = async () => {
    const [usersRes, cobRes] = await Promise.all([
      fetch("/api/usuarios", { headers: { Authorization: token! } }).then(r => r.json()),
      fetch("/api/coberturas").then(r => r.json()),
    ]);
    if (usersRes.payload) setUsuarios(usersRes.payload);
    setCoberturas(cobRes);
  };

  useEffect(() => { cargar(); }, [token]);

  const filtrados = usuarios.filter(u => {
    const q = busqueda.toLowerCase();
    const coincideBusqueda = !q ||
      u.nombre?.toLowerCase().includes(q) ||
      u.apellido?.toLowerCase().includes(q) ||
      u.dni?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q);
    const coincideRol = !filtroRol || u.rol === filtroRol;
    return coincideBusqueda && coincideRol;
  });

  const limpiarFiltros = () => { setBusqueda(""); setFiltroRol(""); };

  const guardarEdicion = async () => {
    if (!editando) return;
    await fetch(`/api/usuarios/${editando.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: token! },
      body: JSON.stringify(editando),
    });
    setEditando(null);
    cargar();
  };

  return (
    <div>
      <h1 className="page-title">Gestión de Usuarios</h1>
      <div className="card mb-6 flex flex-wrap gap-3 items-center">
        <input
          className="input-field flex-1 min-w-[200px]"
          placeholder="Buscar por nombre, apellido, DNI o email..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <select className="select-field max-w-[180px]" value={filtroRol} onChange={e => setFiltroRol(e.target.value)}>
          <option value="">Todos los roles</option>
          {["Operador","Medico","Paciente","Administrador"].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {(busqueda || filtroRol) && (
          <button onClick={limpiarFiltros} className="btn-secondary whitespace-nowrap">Limpiar</button>
        )}
        <span className="text-sm text-gray-400 whitespace-nowrap">{filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {["ID","Nombre","Apellido","DNI","Rol","Cobertura","Teléfono","Email","Acciones"].map(col => (
                <th key={col} className="table-header">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="table-cell">{u.id}</td>
                <td className="table-cell">{u.nombre}</td>
                <td className="table-cell">{u.apellido}</td>
                <td className="table-cell">{u.dni}</td>
                <td className="table-cell"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">{u.rol}</span></td>
                <td className="table-cell">{u.nombre_cobertura}</td>
                <td className="table-cell">{u.telefono}</td>
                <td className="table-cell">{u.email}</td>
                <td className="table-cell">
                  <button onClick={() => setEditando({ ...u })} className="text-blue-600 hover:underline text-xs">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editando && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Editar Usuario</h2>
            <div className="space-y-3">
              {[
                { label: "Nombre", key: "nombre" }, { label: "Apellido", key: "apellido" },
                { label: "DNI", key: "dni" }, { label: "Teléfono", key: "telefono" },
                { label: "Email", key: "email", type: "email" },
              ].map(({ label, key, type = "text" }) => (
                <div key={key}>
                  <label className="label-field">{label}</label>
                  <input type={type} className="input-field" value={(editando as unknown as Record<string, string>)[key] || ""} onChange={e => setEditando(ed => ({ ...ed!, [key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="label-field">Rol</label>
                <select className="select-field" value={editando.rol} onChange={e => setEditando(ed => ({ ...ed!, rol: e.target.value }))}>
                  {["Operador","Medico","Paciente","Administrador"].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="label-field">Cobertura</label>
                <select className="select-field" value={editando.id_cobertura} onChange={e => setEditando(ed => ({ ...ed!, id_cobertura: Number(e.target.value) }))}>
                  {coberturas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={guardarEdicion} className="btn-primary flex-1">Guardar</button>
              <button onClick={() => setEditando(null)} className="btn-secondary flex-1">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
