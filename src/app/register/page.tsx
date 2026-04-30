"use client";
import { toast } from "@/lib/toast";
import { validatePassword } from "@/lib/validatePassword";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Cobertura { id: number; nombre: string; }

export default function RegisterPage() {
  const router = useRouter();
  const [coberturas, setCoberturas] = useState<Cobertura[]>([]);
  const [repeatPassword, setRepeatPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    dni: "", nombre: "", apellido: "", password: "",
    email: "", telefono: "", fecha_nacimiento: "",
    rol: "Paciente", id_cobertura: "",
  });

  useEffect(() => {
    fetch("/api/coberturas").then(r => r.json()).then(setCoberturas).catch(console.error);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const pwCheck = validatePassword(form.password);
    if (!pwCheck.valid) { setError(pwCheck.error!); return; }
    if (form.password !== repeatPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (data.codigo === 200) {
      toast("Usuario creado con éxito");
      router.push("/login");
    } else {
      setError(data.error || "Error al registrarse");
    }
  };

  return (
    <div className="max-w-lg mx-auto py-8">
      <div className="card">
        <h2 className="page-title">Registrar usuario</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">DNI</label>
              <input name="dni" className="input-field" value={form.dni} onChange={handleChange} required />
            </div>
            <div>
              <label className="label-field">Nombre</label>
              <input name="nombre" className="input-field" value={form.nombre} onChange={handleChange} required />
            </div>
            <div>
              <label className="label-field">Apellido</label>
              <input name="apellido" className="input-field" value={form.apellido} onChange={handleChange} required />
            </div>
            <div>
              <label className="label-field">Fecha de nacimiento</label>
              <input type="date" name="fecha_nacimiento" className="input-field" value={form.fecha_nacimiento} onChange={handleChange} max={new Date().toISOString().split("T")[0]} required />
            </div>
            <div>
              <label className="label-field">Contraseña</label>
              <input type="password" name="password" className="input-field" value={form.password} onChange={handleChange} required />
              <p className="text-xs text-slate-400 mt-1">Mínimo 8 caracteres, una mayúscula y un número</p>
            </div>
            <div>
              <label className="label-field">Repetir contraseña</label>
              <input type="password" className="input-field" value={repeatPassword} onChange={e => setRepeatPassword(e.target.value)} required />
            </div>
            <div>
              <label className="label-field">Email</label>
              <input type="email" name="email" className="input-field" value={form.email} onChange={handleChange} required />
            </div>
            <div>
              <label className="label-field">Teléfono</label>
              <input name="telefono" className="input-field" value={form.telefono} onChange={handleChange} required />
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
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? "Registrando..." : "Registrar"}
            </button>
            <Link href="/" className="btn-secondary flex-1 text-center">Cancelar</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
