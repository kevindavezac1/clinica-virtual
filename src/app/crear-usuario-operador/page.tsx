"use client";
import { toast } from "@/lib/toast";
import { validatePassword } from "@/lib/validatePassword";
import FechaNacimientoInput from "@/components/FechaNacimientoInput";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Cobertura { id: number; nombre: string; }

export default function CrearUsuarioOperadorPage() {
  return (
    <ProtectedRoute allowedRole="Operador">
      <CrearPaciente />
    </ProtectedRoute>
  );
}

function CrearPaciente() {
  const router = useRouter();
  const [coberturas, setCoberturas] = useState<Cobertura[]>([]);
  const [repeatPassword, setRepeatPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    dni: "", nombre: "", apellido: "", password: "",
    email: "", telefono: "", fecha_nacimiento: "",
    rol: "Paciente", id_cobertura: "",
  });

  useEffect(() => {
    fetch("/api/coberturas").then(r => r.json()).then(setCoberturas);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value = e.target.value;
    if (e.target.name === "dni") value = value.replace(/\D/g, "").slice(0, 8);
    if (e.target.name === "telefono") value = value.replace(/\D/g, "").slice(0, 15);
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
    setError("");
    const pwCheck = validatePassword(form.password);
    if (!pwCheck.valid) { setError(pwCheck.error!); return; }
    if (form.password !== repeatPassword) { setError("Las contraseñas no coinciden"); return; }
    if (form.dni.length < 7) { setError("El DNI debe tener entre 7 y 8 dígitos"); return; }
    if (form.telefono.length < 10) { setError("El teléfono debe tener 10 dígitos sin 0 ni 15"); return; }
    setLoading(true);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (data.codigo === 200) { toast("Paciente registrado con éxito"); router.push("/"); }
    else setError(data.error || "Error al registrar");
  };

  const fe = (name: string) => fieldErrors[name]
    ? <p className="text-xs text-red-500 mt-1">{fieldErrors[name]}</p>
    : null;

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="page-title">Registrar Paciente</h1>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">DNI</label>
            <input name="dni" className="input-field" value={form.dni} onChange={handleChange} onBlur={handleBlur} inputMode="numeric" maxLength={8} required />
            {fe("dni")}
          </div>
          <div>
            <label className="label-field">Nombre</label>
            <input name="nombre" className="input-field" value={form.nombre} onChange={handleChange} onBlur={handleBlur} required />
            {fe("nombre")}
          </div>
          <div>
            <label className="label-field">Apellido</label>
            <input name="apellido" className="input-field" value={form.apellido} onChange={handleChange} onBlur={handleBlur} required />
            {fe("apellido")}
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
            <input name="telefono" className="input-field" value={form.telefono} onChange={handleChange} onBlur={handleBlur} inputMode="numeric" placeholder="Ej: 3496500494" required />
            {fe("telefono")}
          </div>
          <div className="col-span-2">
            <label className="label-field">Fecha de nacimiento</label>
            <FechaNacimientoInput value={form.fecha_nacimiento} onChange={v => setForm(f => ({ ...f, fecha_nacimiento: v }))} required />
          </div>
          <div>
            <label className="label-field">Repetir contraseña</label>
            <input type="password" className="input-field" value={repeatPassword} onChange={e => setRepeatPassword(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="label-field">Cobertura</label>
          <select name="id_cobertura" className="select-field" value={form.id_cobertura} onChange={handleChange} required>
            <option value="">Seleccioná una cobertura</option>
            {coberturas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        {error && <p className="error-msg">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" className="btn-primary flex-1" disabled={loading}>{loading ? "Registrando..." : "Registrar"}</button>
          <button type="button" onClick={() => router.push("/")} className="btn-secondary flex-1">Cancelar</button>
        </div>
      </form>
    </div>
  );
}
