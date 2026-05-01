"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const rolMenus: Record<string, { href: string; label: string; icon: React.ReactNode; desc: string }[]> = {
  Paciente: [
    {
      href: "/nuevo-turno", label: "Nuevo turno",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
      desc: "Reservá un turno con el especialista que necesités"
    },
    {
      href: "/mis-turnos", label: "Mis turnos",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
      desc: "Consultá y gestioná tus turnos próximos"
    },
    {
      href: "/datos-personales", label: "Mis datos",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>,
      desc: "Actualizá tu información de contacto"
    },
  ],
  Medico: [
    {
      href: "/historial-paciente", label: "Historial clínico",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
      desc: "Consultá el historial clínico de tus pacientes"
    },
    {
      href: "/turnos-programados", label: "Turnos del día",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>,
      desc: "Revisá los pacientes agendados para hoy"
    },
    {
      href: "/gestion-agenda", label: "Mi agenda",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" /></svg>,
      desc: "Configurá tus días y horarios de atención"
    },
  ],
  Operador: [
    {
      href: "/crear-usuario-operador", label: "Registrar paciente",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" /></svg>,
      desc: "Ingresá nuevos pacientes al sistema"
    },
    {
      href: "/asignar-turno", label: "Asignar turno",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
      desc: "Asigná un turno a un paciente existente"
    },
    {
      href: "/ver-agenda-medico-operador", label: "Agenda médicos",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
      desc: "Gestioná la agenda de los médicos"
    },
  ],
  Administrador: [
    {
      href: "/historial-paciente", label: "Historial clínico",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
      desc: "Consultá el historial clínico de cualquier paciente"
    },
    {
      href: "/dashboard", label: "Dashboard",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
      desc: "Métricas y resumen general de la clínica"
    },
    {
      href: "/listar-usuarios", label: "Usuarios",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
      desc: "Gestioná todos los usuarios del sistema"
    },
    {
      href: "/crear-usuario", label: "Nuevo usuario",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" /></svg>,
      desc: "Registrá médicos, operadores y administradores"
    },
    {
      href: "/gestion-coberturas", label: "Coberturas",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
      desc: "Administrá las obras sociales y prepagos"
    },
    {
      href: "/gestion-feriados", label: "Feriados",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008z" /></svg>,
      desc: "Cargá feriados nacionales para bloquear agenda"
    },
    {
      href: "/gestion-especialidad", label: "Especialidades",
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" /></svg>,
      desc: "Gestioná las especialidades médicas"
    },
  ],
};

const features = [
  { icon: "🩺", title: "Médicos especializados", desc: "Contamos con profesionales en múltiples especialidades para atender todas tus necesidades." },
  { icon: "📅", title: "Turnos online", desc: "Reservá tu turno en cualquier momento y desde cualquier lugar, sin filas ni esperas." },
  { icon: "🏥", title: "Atención integral", desc: "Desde consultas de clínica médica hasta especialidades de alta complejidad." },
  { icon: "💳", title: "Obras sociales", desc: "Aceptamos las principales obras sociales y prepagas del país." },
];

export default function HomePage() {
  const { isLoggedIn, user } = useAuth();

  if (!isLoggedIn) {
    return (
      <div className="-mx-4 -mt-8">
        {/* Hero */}
        <div className="bg-gradient-to-br from-brand-800 to-brand-600 text-white px-4 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 tracking-wide">
              CONSULTORIOS ESPERANZA
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
              Tu salud, nuestra <span className="text-brand-200">prioridad</span>
            </h1>
            <p className="text-brand-100 text-lg mb-8 max-w-xl mx-auto">
              Gestioná tus turnos médicos de forma simple y rápida. Profesionales de confianza, atención de calidad.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/login" className="bg-white text-brand-800 font-bold px-8 py-3 rounded-xl hover:bg-brand-50 transition-colors shadow-lg">
                Iniciar sesión
              </Link>
              <Link href="/register" className="bg-brand-700 border-2 border-white/30 text-white font-bold px-8 py-3 rounded-xl hover:bg-brand-800 transition-colors">
                Registrarse gratis
              </Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="max-w-6xl mx-auto px-4 py-16">
          <p className="text-center text-brand-700 font-semibold text-sm uppercase tracking-wide mb-2">¿Por qué elegirnos?</p>
          <h2 className="text-center text-2xl font-bold text-slate-800 mb-10">Atención médica de excelencia</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="card text-center hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-slate-800 mb-1">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-brand-50 border-t border-brand-100 px-4 py-12">
          <div className="max-w-xl mx-auto text-center">
            <h3 className="text-xl font-bold text-slate-800 mb-2">¿Sos paciente nuevo?</h3>
            <p className="text-slate-500 mb-6">Creá tu cuenta en minutos y comenzá a gestionar tus turnos hoy mismo.</p>
            <Link href="/register" className="btn-primary px-8 py-3 text-base">
              Crear cuenta gratuita →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const menu = rolMenus[user?.rol || ""] || [];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-brand-700 to-brand-600 text-white rounded-2xl p-6 mb-8 shadow-lg">
        <p className="text-brand-200 text-sm font-medium mb-1">Bienvenido de nuevo</p>
        <h1 className="text-2xl font-bold">{user?.nombre} {user?.apellido ?? ""}</h1>
        <span className="inline-block mt-2 bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
          {user?.rol}
        </span>
      </div>

      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">¿Qué querés hacer?</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {menu.map((item) => (
          <Link key={item.href} href={item.href} className="card-hover group">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
                {item.icon}
              </div>
              <div>
                <p className="font-bold text-slate-800 group-hover:text-brand-700 transition-colors">{item.label}</p>
                <p className="text-sm text-slate-500 mt-0.5 leading-snug">{item.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
