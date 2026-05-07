"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [estado, setEstado] = useState<"cargando" | "ok" | "error">("cargando");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    if (!token) {
      setEstado("error");
      setMensaje("Enlace inválido.");
      return;
    }
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.codigo === 200) {
          setEstado("ok");
        } else {
          setEstado("error");
          setMensaje(data.mensaje ?? "El enlace es inválido o ya expiró.");
        }
      })
      .catch(() => {
        setEstado("error");
        setMensaje("Error de conexión. Intentá de nuevo.");
      });
  }, [token]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card max-w-md w-full text-center space-y-4">
        {estado === "cargando" && (
          <p className="text-slate-500">Verificando tu email...</p>
        )}
        {estado === "ok" && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Email verificado</h2>
            <p className="text-slate-500 text-sm">Tu cuenta está activa. Ya podés ingresar.</p>
            <Link href="/login" className="btn-primary inline-block">Ir al login</Link>
          </>
        )}
        {estado === "error" && (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Enlace inválido</h2>
            <p className="text-slate-500 text-sm">{mensaje}</p>
            <Link href="/resend-verification" className="btn-secondary inline-block">Solicitar nuevo enlace</Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
