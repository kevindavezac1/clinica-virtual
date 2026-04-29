"use client";
import { toast } from "@/lib/toast";

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
  const [form, setForm] = useState({
    dni: "", nombre: "", apellido: "", password: "",
    email: "", telefono: "", fecha_nacimiento: "",
    rol: "Paciente", id_cobertura: "",
  });

  useEffect(() => {
    fetch("/api/coberturas").then(r => r.json()).then(setCoberturas);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== repeatPassword) { setError("Las contraseñas no coinciden"); return; }
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

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="page-title">Registrar Paciente</h1>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "DNI", name: "dni" }, { label: "Nombre", name: "nombre" },
            { label: "Apellido", name: "apellido" },
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
