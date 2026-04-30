"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { validatePassword } from "@/lib/validatePassword";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="card max-w-md w-full text-center space-y-4">
        <p className="text-red-600">Enlace inválido. Solicitá uno nuevo.</p>
        <Link href="/forgot-password" className="btn-primary inline-block">Solicitar enlace</Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) { setError(pwCheck.error!); return; }
    if (password !== repeat) { setError("Las contraseñas no coinciden"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (data.codigo === 200) {
        router.push("/login?reset=ok");
      } else {
        setError(data.mensaje || "Error al restablecer la contraseña");
      }
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card max-w-md w-full">
      <h2 className="page-title">Nueva contraseña</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-field">Nueva contraseña</label>
          <input
            type="password"
            className="input-field"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <p className="text-xs text-slate-400 mt-1">Mínimo 8 caracteres, una mayúscula y un número</p>
        </div>
        <div>
          <label className="label-field">Repetir contraseña</label>
          <input
            type="password"
            className="input-field"
            value={repeat}
            onChange={e => setRepeat(e.target.value)}
            required
          />
        </div>
        {error && <p className="error-msg">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Guardando..." : "Establecer contraseña"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Suspense fallback={<div className="card max-w-md w-full text-center text-slate-500">Cargando...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
