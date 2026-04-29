"use client";
import { toast } from "@/lib/toast";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useRouter } from "next/navigation";

interface Cobertura { id: number; nombre: string; }

export default function DatosPersonalesPage() {
  return (
    <ProtectedRoute allowedRole="Paciente">
      <DatosPersonales />
    </ProtectedRoute>
  );
}

function DatosPersonales() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [usuario, setUsuario] = useState<Record<string, string>>({});
  const [coberturas, setCoberturas] = useState<Cobertura[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch(`/api/usuarios/${user.id}`, { headers: { Authorization: token! } }).then(r => r.json()),
      fetch("/api/coberturas").then(r => r.json()),
    ]).then(([userData, coberturasData]) => {
      if (userData.codigo === 200) setUsuario(userData.payload[0]);
      setCoberturas(coberturasData);
    }).finally(() => setLoading(false));
  }, [user, token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setUsuario(u => ({ ...u, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    const res = await fetch(`/api/usuarios/${user!.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: token! },
      body: JSON.stringify(usuario),
    });
    const data = await res.json();
    if (data.codigo === 200) {
      toast("Cambios guardados con éxito");
      setEditMode(false);
    } else {
      toast("Error al guardar: " + (data.mensaje || data.error), "error");
    }
  };

  if (loading) return <p className="text-center py-12 text-gray-500">Cargando datos...</p>;

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="page-title">Datos Personales</h1>
      <div className="card space-y-4">
        {[
          { label: "Nombre", name: "nombre", disabled: true },
          { label: "Apellido", name: "apellido", disabled: true },
          { label: "DNI", name: "dni", disabled: true },
          { label: "Fecha de nacimiento", name: "fecha_nacimiento", type: "date", disabled: true },
          { label: "Email", name: "email", type: "email" },
          { label: "Teléfono", name: "telefono" },
          { label: "Contraseña", name: "password", type: "password" },
        ].map(({ label, name, type = "text", disabled }) => (
          <div key={name}>
            <label className="label-field">{label}</label>
            <input
              type={type}
              name={name}
              className="input-field"
              value={name === "fecha_nacimiento" ? (usuario[name] || "").split("T")[0] : (usuario[name] || "")}
              onChange={handleChange}
              disabled={disabled || !editMode}
            />
          </div>
        ))}
        <div>
          <label className="label-field">Cobertura</label>
          <select name="id_cobertura" className="select-field" value={usuario.id_cobertura || ""} onChange={handleChange} disabled={!editMode}>
            {coberturas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          {!editMode ? (
            <button onClick={() => setEditMode(true)} className="btn-primary">Editar</button>
          ) : (
            <button onClick={handleSave} className="btn-primary">Guardar cambios</button>
          )}
          <button onClick={() => router.push("/")} className="btn-secondary">Volver al inicio</button>
        </div>
      </div>
    </div>
  );
}
