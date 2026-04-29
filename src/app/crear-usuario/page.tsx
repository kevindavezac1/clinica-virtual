"use client";
import { toast } from "@/lib/toast";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Cobertura { id: number; nombre: string; }
interface Especialidad { id: number; descripcion: string; }

export default function CrearUsuarioPage() {
  return (
    <ProtectedRoute allowedRole="Administrador">
      <CrearUsuario />
    </ProtectedRoute>
  );
}

function CrearUsuario() {
  const { token } = useAuth();
  const router = useRouter();
  const [coberturas, setCoberturas] = useState<Cobertura[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    dni: "", nombre: "", apellido: "", fecha_nacimiento: "", password: "",
    rol: "Operador", email: "", telefono: "", id_cobertura: "", id_especialidad: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/coberturas").then(r => r.json()),
      fetch("/api/especialidades", { headers: { Authorization: token! } }).then(r => r.json()),
    ]).then(([cob, esp]) => {
      setCoberturas(cob);
      if (esp.payload) setEspecialidades(esp.payload);
    });
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token! },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (data.codigo === 200) {
      toast("Usuario creado correctamente");
      setForm({ dni: "", nombre: "", apellido: "", fecha_nacimiento: "", password: "", rol: "Operador", email: "", telefono: "", id_cobertura: "", id_especialidad: "" });
    } else {
      toast("Error al crear el usuario: " + (data.error || ""), "error");
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="page-title">Crear Usuario</h1>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "DNI", name: "dni" }, { label: "Apellido", name: "apellido" },
            { label: "Nombre", name: "nombre" },
            { label: "Fecha de nacimiento", name: "fecha_nacimiento", type: "date" },
            { label: "Contraseña", name: "password", type: "password" },
            { label: "Email", name: "email", type: "email" },
            { label: "Teléfono", name: "telefono" },
          ].map(({ label, name, type = "text" }) => (
            <div key={name}>
              <label className="label-field">{label}</label>
              <input type={type} name={name} className="input-field" value={(form as Record<string, string>)[name]} onChange={handleChange} max={type === "date" ? new Date().toISOString().split("T")[0] : undefined} required />
            </div>
          ))}
        </div>
        <div>
          <label className="label-field">Rol</label>
          <select name="rol" className="select-field" value={form.rol} onChange={handleChange} required>
            <option value="Operador">Operador</option>
            <option value="Medico">Médico</option>
            <option value="Administrador">Administrador</option>
          </select>
        </div>
        {form.rol === "Medico" && (
          <div>
            <label className="label-field">Especialidad</label>
            <select name="id_especialidad" className="select-field" value={form.id_especialidad} onChange={handleChange} required>
              <option value="">Seleccioná una especialidad</option>
              {especialidades.map(e => <option key={e.id} value={e.id}>{e.descripcion}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="label-field">Email</label>
          <input type="email" name="email" className="input-field" value={form.email} onChange={handleChange} required />
        </div>
        <div>
          <label className="label-field">Cobertura</label>
          <select name="id_cobertura" className="select-field" value={form.id_cobertura} onChange={handleChange} required>
            <option value="">Seleccioná una cobertura</option>
            {coberturas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="flex gap-3">
          <button type="submit" className="btn-primary flex-1" disabled={loading}>{loading ? "Creando..." : "Crear Usuario"}</button>
          <button type="button" onClick={() => router.push("/")} className="btn-secondary flex-1">Volver al inicio</button>
        </div>
      </form>
    </div>
  );
}
