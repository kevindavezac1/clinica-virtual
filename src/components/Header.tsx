"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import ConfirmDialog from "@/components/ConfirmDialog";

const rolColor: Record<string, string> = {
  Paciente: "badge-teal",
  Medico: "badge-blue",
  Operador: "badge-purple",
  Administrador: "badge-orange",
};

export default function Header() {
  const { isLoggedIn, user, logout } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 bg-brand-700 rounded-xl flex items-center justify-center shadow-sm group-hover:bg-brand-800 transition-colors">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-slate-900 group-hover:text-brand-700 transition-colors">Consultorios</p>
            <p className="text-xs text-brand-600 font-semibold tracking-wide">ESPERANZA</p>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-800">{user?.nombre}</span>
                <span className={`text-xs ${rolColor[user?.rol || ""] ?? "badge-teal"} mt-0.5`}>{user?.rol}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm select-none">
                {user?.nombre?.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={() => setConfirmLogout(true)}
                className="btn-ghost text-red-500 hover:bg-red-50 hover:text-red-600"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Salir</span>
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Iniciar sesión
              </Link>
              <Link href="/register" className="btn-primary text-sm px-4 py-2">
                Registrarse
              </Link>
            </>
          )}
        </nav>
      </div>

      {confirmLogout && (
        <ConfirmDialog
          message="¿Querés cerrar sesión?"
          confirmLabel="Salir"
          cancelLabel="Cancelar"
          variant="warning"
          onConfirm={() => { setConfirmLogout(false); logout(); }}
          onCancel={() => setConfirmLogout(false)}
        />
      )}
    </header>
  );
}
