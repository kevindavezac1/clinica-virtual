"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { toast } from "@/lib/toast";

interface Paciente {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  email: string;
  fecha_nacimiento: string;
  id_cobertura: number | null;
  nombre_cobertura: string | null;
  datos_verificados: boolean;
  email_verificado: boolean;
}

interface Cobertura { id: number; nombre: string; }

interface FormEdicion {
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  fecha_nacimiento: string;
  id_cobertura: number | null;
  datos_verificados: boolean;
}

export default function GestionPacientesPage() {
  return (
    <ProtectedRoute allowedRole="Operador">
      <GestionPacientes />
    </ProtectedRoute>
  );
}

function GestionPacientes() {
  const { token } = useAuth();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [coberturas, setCoberturas] = useState<Cobertura[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [soloSinVerificar, setSoloSinVerificar] = useState(false);
  const [editando, setEditando] = useState<Paciente | null>(null);
  const [form, setForm] = useState<FormEdicion | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 20;

  const cargar = async () => {
    const [pacRes, cobRes] = await Promise.all([
      fetch("/api/usuarios?rol=Paciente", { headers: { Authorization: token! } }).then(r => r.json()),
      fetch("/api/coberturas").then(r => r.json()),
    ]);
    if (pacRes.payload) setPacientes(pacRes.payload as Paciente[]);
    if (Array.isArray(cobRes)) setCoberturas(cobRes);
  };

  useEffect(() => { cargar(); }, [token]);

  const filtrados = pacientes.filter(p => {
    const q = busqueda.toLowerCase();
    const coincide = !q ||
      p.nombre?.toLowerCase().includes(q) ||
      p.apellido?.toLowerCase().includes(q) ||
      p.dni?.toLowerCase().includes(q);
    const verificacion = !soloSinVerificar || !p.datos_verificados;
    return coincide && verificacion;
  });

  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);
  const paginados = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const abrirEdicion = (p: Paciente) => {
    setEditando(p);
    setForm({
      nombre: p.nombre,
      apellido: p.apellido,
      dni: p.dni,
      telefono: p.telefono,
      fecha_nacimiento: (p.fecha_nacimiento ?? "").slice(0, 10),
      id_cobertura: p.id_cobertura,
      datos_verificados: p.datos_verificados,
    });
  };

  const guardar = async () => {
    if (!form || !editando) return;
    if (form.dni.length < 7) { toast("El DNI debe tener entre 7 y 8 dígitos", "error"); return; }
    if (form.telefono.length < 10) { toast("El teléfono debe tener 10 dígitos sin 0 ni 15", "error"); return; }
    setGuardando(true);
    const res = await fetch(`/api/usuarios/${editando.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: token! },
      body: JSON.stringify(form),
    }).then(r => r.json());
    setGuardando(false);
    if (res.codigo === 200) {
      toast("Datos actualizados correctamente");
      setEditando(null);
      cargar();
    } else {
      toast(res.error || res.mensaje || "Error al guardar", "error");
    }
  };

  return (
    <div>
      <h1 className="page-title">Gestión de Pacientes</h1>

      {/* Filtros */}
      <div className="card mb-6 flex flex-wrap gap-3 items-center">
        <input
          className="input-field flex-1 min-w-[200px]"
          placeholder="Buscar por nombre, apellido o DNI..."
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
        />
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none whitespace-nowrap">
          <input
            type="checkbox"
            checked={soloSinVerificar}
            onChange={e => { setSoloSinVerificar(e.target.checked); setPagina(1); }}
            className="w-4 h-4 accent-brand-700"
          />
          Solo sin verificar
        </label>
        <span className="text-sm text-gray-400 whitespace-nowrap">
          {filtrados.length} paciente{filtrados.length !== 1 ? "s" : ""}
          {soloSinVerificar && ` sin verificar`}
        </span>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {["Nombre", "Apellido", "DNI", "Cobertura", "Teléfono", "Email ✓", "Datos ✓", "Acciones"].map(col => (
                <th key={col} className="table-header">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginados.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400 text-sm">
                  {soloSinVerificar ? "Todos los pacientes están verificados." : "No hay pacientes registrados."}
                </td>
              </tr>
            ) : paginados.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="table-cell font-medium">{p.nombre}</td>
                <td className="table-cell">{p.apellido}</td>
                <td className="table-cell">{p.dni}</td>
                <td className="table-cell">{p.nombre_cobertura ?? "—"}</td>
                <td className="table-cell">{p.telefono}</td>
                <td className="table-cell">
                  {p.email_verificado
                    ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Sí</span>
                    : <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">No</span>}
                </td>
                <td className="table-cell">
                  {p.datos_verificados
                    ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Verificado</span>
                    : <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Pendiente</span>}
                </td>
                <td className="table-cell">
                  <button onClick={() => abrirEdicion(p)} className="text-blue-600 hover:underline text-xs font-medium">
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} className="btn-secondary disabled:opacity-40">
            ← Anterior
          </button>
          <span>Página {pagina} de {totalPaginas}</span>
          <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} className="btn-secondary disabled:opacity-40">
            Siguiente →
          </button>
        </div>
      )}

      {/* Modal de edición */}
      {editando && form && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-1">Editar paciente</h2>
            <p className="text-sm text-gray-400 mb-4">{editando.apellido}, {editando.nombre}</p>
            <div className="space-y-3">
              {[
                { label: "Nombre", key: "nombre" },
                { label: "Apellido", key: "apellido" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="label-field">{label}</label>
                  <input
                    type="text"
                    className="input-field"
                    value={(form as unknown as Record<string, string>)[key]}
                    onChange={e => setForm(f => ({ ...f!, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className="label-field">DNI</label>
                <input
                  type="text"
                  className="input-field"
                  value={form.dni}
                  inputMode="numeric"
                  maxLength={8}
                  onChange={e => setForm(f => ({ ...f!, dni: e.target.value.replace(/\D/g, "").slice(0, 8) }))}
                />
                <p className="text-xs text-gray-400 mt-1">7 u 8 dígitos</p>
              </div>
              <div>
                <label className="label-field">Teléfono</label>
                <input
                  type="text"
                  className="input-field"
                  value={form.telefono}
                  inputMode="numeric"
                  maxLength={10}
                  onChange={e => setForm(f => ({ ...f!, telefono: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                />
                <p className="text-xs text-gray-400 mt-1">Sin 0 ni 15 (ej: 3496500494)</p>
              </div>
              <div>
                <label className="label-field">Fecha de nacimiento</label>
                <input
                  type="date"
                  className="input-field"
                  value={form.fecha_nacimiento}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={e => setForm(f => ({ ...f!, fecha_nacimiento: e.target.value }))}
                />
              </div>
              <div>
                <label className="label-field">Cobertura</label>
                <select
                  className="select-field"
                  value={form.id_cobertura ?? ""}
                  onChange={e => setForm(f => ({ ...f!, id_cobertura: e.target.value ? Number(e.target.value) : null }))}
                >
                  <option value="">Sin cobertura</option>
                  {coberturas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                <input
                  type="checkbox"
                  id="datos_verificados_modal"
                  checked={form.datos_verificados}
                  onChange={e => setForm(f => ({ ...f!, datos_verificados: e.target.checked }))}
                  className="w-4 h-4 accent-brand-700"
                />
                <label htmlFor="datos_verificados_modal" className="text-sm text-gray-700 select-none cursor-pointer">
                  Datos verificados en persona
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={guardar} disabled={guardando} className="btn-primary flex-1">
                {guardando ? "Guardando..." : "Guardar"}
              </button>
              <button onClick={() => setEditando(null)} className="btn-secondary flex-1">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
