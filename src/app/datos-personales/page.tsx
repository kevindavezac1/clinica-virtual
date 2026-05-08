"use client";
import { toast } from "@/lib/toast";
import { validatePassword } from "@/lib/validatePassword";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useRouter } from "next/navigation";

interface Cobertura { id: number; nombre: string; }

export default function DatosPersonalesPage() {
  return (
    <ProtectedRoute allowedRole={["Paciente", "Medico", "Operador"]}>
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
  const [telefono, setTelefono] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [telefonoError, setTelefonoError] = useState("");

  useEffect(() => {
    if (!user) return;
    const esPaciente = user.rol === "Paciente";
    const fetches: Promise<unknown>[] = [
      fetch(`/api/usuarios/${user.id}`, { headers: { Authorization: token! } }).then(r => r.json()),
      ...(esPaciente ? [fetch("/api/coberturas").then(r => r.json())] : []),
    ];
    Promise.all(fetches).then(([userData, coberturasData]) => {
      if ((userData as { codigo: number }).codigo === 200) {
        const { password: _, ...withoutPassword } = (userData as { codigo: number; payload: Record<string, string>[] }).payload[0];
        setUsuario(withoutPassword);
        setTelefono(withoutPassword.telefono || "");
      }
      if (coberturasData) setCoberturas(coberturasData as Cobertura[]);
    }).finally(() => setLoading(false));
  }, [user, token]);

  const cancelEdit = () => {
    setEditMode(false);
    setTelefono(usuario.telefono || "");
    setCurrentPassword("");
    setNewPassword("");
    setTelefonoError("");
  };

  const handleTelefonoChange = (val: string) => {
    const solo = val.replace(/\D/g, "").slice(0, 10);
    setTelefono(solo);
    if (solo && solo.length !== 10) setTelefonoError("Debe tener exactamente 10 dígitos (ej: 3496502690)");
    else setTelefonoError("");
  };

  const handleSave = async () => {
    if (telefono && !/^\d{10}$/.test(telefono)) {
      toast("Teléfono inválido: ingresá 10 dígitos sin 0 ni 15 (ej: 3496502690)", "error");
      return;
    }
    if (newPassword.trim() !== "") {
      if (!currentPassword.trim()) {
        toast("Ingresá tu contraseña actual para poder cambiarla", "error");
        return;
      }
      const pwCheck = validatePassword(newPassword);
      if (!pwCheck.valid) { toast(pwCheck.error!, "error"); return; }
    }

    const body: Record<string, unknown> = {
      telefono,
      ...(user?.rol === "Paciente" ? { id_cobertura: usuario.id_cobertura } : {}),
      ...(newPassword.trim() !== "" ? { password: newPassword, current_password: currentPassword } : {}),
    };

    const res = await fetch(`/api/usuarios/${user!.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: token! },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.codigo === 200) {
      toast("Cambios guardados con éxito");
      setUsuario(u => ({ ...u, telefono }));
      cancelEdit();
    } else {
      toast(data.mensaje || data.error || "Error al guardar", "error");
    }
  };

  if (loading) return <p className="text-center py-12 text-gray-500">Cargando datos...</p>;

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="page-title">Datos Personales</h1>
      <div className="card space-y-4">

        {/* Campos de identidad — solo lectura */}
        {[
          { label: "Nombre", value: usuario.nombre },
          { label: "Apellido", value: usuario.apellido },
          { label: "DNI", value: usuario.dni },
          { label: "Fecha de nacimiento", value: (usuario.fecha_nacimiento || "").split("T")[0] },
        ].map(({ label, value }) => (
          <div key={label}>
            <label className="label-field">{label}</label>
            <input type="text" className="input-field bg-gray-50 text-gray-500" value={value || ""} readOnly />
          </div>
        ))}

        {/* Email — solo Admin puede modificar */}
        <div>
          <label className="label-field">Email</label>
          <input type="email" className="input-field bg-gray-50 text-gray-500" value={usuario.email || ""} readOnly />
          {editMode && (
            <p className="text-xs text-gray-400 mt-1">
              {user?.rol === "Paciente"
                ? "Para cambiar el email, hablá con la secretaría."
                : "Para cambiar el email, contactá al administrador."}
            </p>
          )}
        </div>

        {/* Teléfono — editable */}
        <div>
          <label className="label-field">Teléfono</label>
          <input
            type="tel"
            inputMode="numeric"
            className={`input-field ${telefonoError ? "border-red-400" : ""}`}
            value={editMode ? telefono : (usuario.telefono || "")}
            onChange={e => editMode && handleTelefonoChange(e.target.value)}
            readOnly={!editMode}
            placeholder="Ej: 3496502690"
            maxLength={10}
          />
          {telefonoError && <p className="text-xs text-red-500 mt-1">{telefonoError}</p>}
        </div>

        {/* Cobertura — solo Paciente */}
        {user?.rol === "Paciente" && (
          <div>
            <label className="label-field">Cobertura</label>
            <select
              className="select-field"
              value={usuario.id_cobertura || ""}
              onChange={e => setUsuario(u => ({ ...u, id_cobertura: e.target.value }))}
              disabled={!editMode}
            >
              {coberturas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        )}

        {/* Cambio de contraseña */}
        {editMode && (
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-600">Cambiar contraseña <span className="text-xs text-gray-400">(opcional)</span></p>
            <div>
              <label className="label-field">Contraseña actual</label>
              <input
                type="password"
                className="input-field"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Requerida para cambiar contraseña"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="label-field">Nueva contraseña</label>
              <input
                type="password"
                className="input-field"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Dejá vacío para no cambiar"
                autoComplete="new-password"
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          {!editMode ? (
            <button onClick={() => setEditMode(true)} className="btn-primary">Editar</button>
          ) : (
            <>
              <button onClick={handleSave} className="btn-primary">Guardar cambios</button>
              <button onClick={cancelEdit} className="btn-secondary">Cancelar</button>
            </>
          )}
          {!editMode && <button onClick={() => router.push("/")} className="btn-secondary">Volver al inicio</button>}
        </div>
      </div>
    </div>
  );
}
