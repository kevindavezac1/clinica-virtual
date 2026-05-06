"use client";
import { toast } from "@/lib/toast";
import { validatePassword } from "@/lib/validatePassword";
import FechaNacimientoInput from "@/components/FechaNacimientoInput";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

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
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    dni: "", nombre: "", apellido: "", fecha_nacimiento: "", password: "",
    rol: "Operador", email: "", telefono: "", id_especialidad: "",
  });

  useEffect(() => {
    fetch("/api/especialidades", { headers: { Authorization: token! } })
      .then(r => r.json())
      .then(esp => { if (esp.payload) setEspecialidades(esp.payload); });
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value = e.target.value;
    if (e.target.name === "dni") value = value.replace(/\D/g, "").slice(0, 8);
    if (e.target.name === "telefono") value = value.replace(/\D/g, "").slice(0, 10);
    if (e.target.name === "nombre" || e.target.name === "apellido") value = value.replace(/[0-9]/g, "");
    setForm(f => ({ ...f, [e.target.name]: value }));
    if (fieldErrors[e.target.name]) setFieldErrors(f => ({ ...f, [e.target.name]: "" }));
  };

  const validateField = (name: string, value: string): string => {
    if (name === "dni" && value.length > 0 && value.length < 7) return "Debe tener entre 7 y 8 dígitos";
    if (name === "telefono" && value.length > 0 && value.length > 0 && value.length < 10) return "10 dígitos sin 0 ni 15 (ej: 3496500494)";
    if ((name === "nombre" || name === "apellido") && value.trim().length === 0 && value.length > 0) return "No puede ser solo espacios";
    return "";
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setFieldErrors(f => ({ ...f, [e.target.name]: validateField(e.target.name, e.target.value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pwCheck = validatePassword(form.password);
    if (!pwCheck.valid) { toast(pwCheck.error!, "error"); return; }
    const fechaNac = new Date(form.fecha_nacimiento);
    const hoy = new Date();
    const edad = hoy.getFullYear() - fechaNac.getFullYear() -
      (hoy < new Date(hoy.getFullYear(), fechaNac.getMonth(), fechaNac.getDate()) ? 1 : 0);
    if (edad < 18) { toast("El usuario debe ser mayor de 18 años", "error"); return; }
    if (form.rol === "Medico" && !form.id_especialidad) { toast("Seleccioná una especialidad para el médico", "error"); return; }
    if (form.dni.length < 7) { toast("El DNI debe tener entre 7 y 8 dígitos", "error"); return; }
    if (form.telefono.length < 10) { toast("El teléfono debe tener 10 dígitos sin 0 ni 15", "error"); return; }
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
      setForm({ dni: "", nombre: "", apellido: "", fecha_nacimiento: "", password: "", rol: "Operador", email: "", telefono: "", id_especialidad: "" });
      setFieldErrors({});
    } else {
      toast("Error al crear el usuario: " + (data.error || ""), "error");
    }
  };

  const fe = (name: string) => fieldErrors[name]
    ? <p className="text-xs text-red-500 mt-1">{fieldErrors[name]}</p>
    : null;

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="page-title">Crear Usuario</h1>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">DNI</label>
            <input name="dni" className="input-field" value={form.dni} onChange={handleChange} onBlur={handleBlur} inputMode="numeric" maxLength={8} required />
            {fe("dni")}
          </div>
          <div>
            <label className="label-field">Apellido</label>
            <input name="apellido" className="input-field" value={form.apellido} onChange={handleChange} onBlur={handleBlur} required />
            {fe("apellido")}
          </div>
          <div>
            <label className="label-field">Nombre</label>
            <input name="nombre" className="input-field" value={form.nombre} onChange={handleChange} onBlur={handleBlur} required />
            {fe("nombre")}
          </div>
          <div>
            <label className="label-field">Contraseña</label>
            <input type="password" name="password" className="input-field" value={form.password} onChange={handleChange} required />
          </div>
          <div>
            <label className="label-field">Email</label>
            <input type="email" name="email" className="input-field" value={form.email} onChange={handleChange} required />
          </div>
          <div>
            <label className="label-field">Teléfono</label>
            <input name="telefono" className="input-field" value={form.telefono} onChange={handleChange} onBlur={handleBlur} inputMode="numeric" placeholder="Ej: 3496500494" maxLength={10} required />
            {fe("telefono")}
          </div>
          <div className="col-span-2">
            <label className="label-field">Fecha de nacimiento</label>
            <FechaNacimientoInput value={form.fecha_nacimiento} onChange={v => setForm(f => ({ ...f, fecha_nacimiento: v }))} required />
          </div>
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
        <div className="flex gap-3">
          <button type="submit" className="btn-primary flex-1" disabled={loading}>
            {loading ? "Creando..." : "Crear Usuario"}
          </button>
          <button type="button" onClick={() => router.push("/")} className="btn-secondary flex-1">
            Volver al inicio
          </button>
        </div>
      </form>
    </div>
  );
}
