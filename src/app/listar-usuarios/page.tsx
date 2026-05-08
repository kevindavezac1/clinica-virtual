"use client";
import { toast } from "@/lib/toast";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Usuario {
  id: number; dni: string; nombre: string; apellido: string; rol: string;
  nombre_cobertura: string; telefono: string; email: string; id_cobertura: number;
  fecha_nacimiento: string; email_verificado: boolean; datos_verificados: boolean;
}
interface Cobertura { id: number; nombre: string; }

export default function ListarUsuariosPage() {
  return (
    <ProtectedRoute allowedRole="Administrador">
      <ListarUsuarios />
    </ProtectedRoute>
  );
}

const rolBadge: Record<string, string> = {
  Paciente: "badge-teal",
  Medico: "badge-blue",
  Operador: "badge-purple",
  Administrador: "badge-orange",
};

function ListarUsuarios() {
  const { token } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [coberturas, setCoberturas] = useState<Cobertura[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("");
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 25;

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
  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);
  const paginados = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const limpiarFiltros = () => { setBusqueda(""); setFiltroRol(""); setPagina(1); };

  const guardarEdicion = async () => {
    if (!editando) return;
    if (editando.dni.length < 7) { toast("El DNI debe tener entre 7 y 8 dígitos", "error"); return; }
    if (editando.telefono.length < 10) { toast("El teléfono debe tener 10 dígitos sin 0 ni 15 (ej: 3496500494)", "error"); return; }
    const res = await fetch(`/api/usuarios/${editando.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: token! },
      body: JSON.stringify(editando),
    }).then(r => r.json());
    if (res.codigo === 200) {
      toast("Usuario actualizado correctamente");
      setEditando(null);
      cargar();
    } else {
      toast(res.error || res.mensaje || "Error al guardar", "error");
    }
  };

  return (
    <div>
      <h1 className="page-title">Gestión de Usuarios</h1>
      <div className="card mb-6 flex flex-wrap gap-3 items-center">
        <input
          className="input-field flex-1 min-w-[200px]"
          placeholder="Buscar por nombre, apellido, DNI o email..."
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
        />
        <select className="select-field max-w-[180px]" value={filtroRol} onChange={e => { setFiltroRol(e.target.value); setPagina(1); }}>
          <option value="">Todos los roles</option>
          {["Operador","Medico","Paciente","Administrador"].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {(busqueda || filtroRol) && (
          <button onClick={limpiarFiltros} className="btn-secondary whitespace-nowrap">Limpiar</button>
        )}
        <span className="text-sm text-slate-400 whitespace-nowrap">{filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {["Usuario","DNI","Rol","Cobertura","Email","Verificaciones","Acciones"].map(col => (
                <th key={col} className="table-header">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginados.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="table-cell">
                  <span className="font-medium text-slate-800">{u.apellido}, {u.nombre}</span>
                  <span className="block text-xs text-slate-400">{u.telefono}</span>
                </td>
                <td className="table-cell font-mono">{u.dni}</td>
                <td className="table-cell"><span className={`badge ${rolBadge[u.rol] ?? "badge-gray"}`}>{u.rol}</span></td>
                <td className="table-cell">{u.rol === "Paciente" ? u.nombre_cobertura : "—"}</td>
                <td className="table-cell max-w-[200px]">
                  <span className="block truncate" title={u.email}>{u.email}</span>
                </td>
                <td className="table-cell">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      {u.email_verificado
                        ? <span className="badge badge-green">Email ✓</span>
                        : <span className="badge badge-red">Email ✗</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {u.datos_verificados
                        ? <span className="badge badge-green">Datos ✓</span>
                        : <span className="badge badge-yellow">Sin verificar</span>}
                    </div>
                  </div>
                </td>
                <td className="table-cell">
                  <button onClick={() => setEditando({ ...u })} className="text-brand-700 hover:text-brand-900 font-medium text-xs transition-colors">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
          <button
            onClick={() => setPagina(p => Math.max(1, p - 1))}
            disabled={pagina === 1}
            className="btn-secondary disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span>Página {pagina} de {totalPaginas}</span>
          <button
            onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
            disabled={pagina === totalPaginas}
            className="btn-secondary disabled:opacity-40"
          >
            Siguiente →
          </button>
        </div>
      )}

      {editando && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-card-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Editar Usuario</h2>
            <div className="space-y-3">
              {[
                { label: "Nombre", key: "nombre" }, { label: "Apellido", key: "apellido" },
                { label: "DNI", key: "dni" }, { label: "Teléfono", key: "telefono" },
                { label: "Email", key: "email", type: "email" },
                { label: "Fecha de nacimiento", key: "fecha_nacimiento", type: "date" },
              ].map(({ label, key, type = "text" }) => (
                <div key={key}>
                  <label className="label-field">{label}</label>
                  <input
                    type={type}
                    className="input-field"
                    value={
                      key === "fecha_nacimiento"
                        ? ((editando as unknown as Record<string, string>)[key] || "").slice(0, 10)
                        : (editando as unknown as Record<string, string>)[key] || ""
                    }
                    max={type === "date" ? new Date().toISOString().split("T")[0] : undefined}
                    inputMode={key === "dni" || key === "telefono" ? "numeric" : undefined}
                    maxLength={key === "dni" ? 8 : key === "telefono" ? 10 : undefined}
                    onChange={e => {
                      let val = e.target.value;
                      if (key === "dni") val = val.replace(/\D/g, "").slice(0, 8);
                      if (key === "telefono") val = val.replace(/\D/g, "").slice(0, 10);
                      setEditando(ed => ({ ...ed!, [key]: val }));
                    }}
                  />
                  {key === "telefono" && (
                    <p className="text-xs text-slate-400 mt-1">Sin 0 ni 15 (ej: 3496500494)</p>
                  )}
                  {key === "dni" && (
                    <p className="text-xs text-slate-400 mt-1">7 u 8 dígitos</p>
                  )}
                </div>
              ))}
              <div>
                <label className="label-field">Rol</label>
                <input className="input-field bg-slate-50 text-slate-500" value={editando.rol} readOnly />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="datos_verificados"
                  checked={editando.datos_verificados}
                  onChange={e => setEditando(ed => ({ ...ed!, datos_verificados: e.target.checked }))}
                  className="w-4 h-4 accent-brand-700"
                />
                <label htmlFor="datos_verificados" className="text-sm text-slate-700 select-none cursor-pointer">
                  Datos verificados en persona
                </label>
              </div>
              {editando.rol === "Paciente" && (
                <div>
                  <label className="label-field">Cobertura</label>
                  <select className="select-field" value={editando.id_cobertura} onChange={e => setEditando(ed => ({ ...ed!, id_cobertura: Number(e.target.value) }))}>
                    {coberturas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
              )}
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
