export default function Footer() {
  return (
    <footer className="bg-brand-900 text-brand-100 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">

        {/* Brand */}
        <div className="md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-white">Consultorios</p>
              <p className="text-xs text-brand-300 font-semibold tracking-wide">ESPERANZA</p>
            </div>
          </div>
          <p className="text-sm text-brand-300 leading-relaxed">
            Atención médica de calidad con tecnología al servicio de tu salud.
          </p>
        </div>

        {/* Contacto */}
        <div>
          <p className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">Contacto</p>
          <ul className="space-y-2 text-sm text-brand-300">
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              San Jerónimo 2558, Esperanza
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              +54 3496 417428
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              MiClinica@gmail.com
            </li>
          </ul>
        </div>

        {/* Horarios */}
        <div>
          <p className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">Horarios</p>
          <ul className="space-y-1.5 text-sm text-brand-300">
            <li className="flex justify-between gap-4"><span>Lun – Vie</span><span className="text-white font-medium">8:00 – 20:00</span></li>
            <li className="flex justify-between gap-4"><span>Sábados</span><span className="text-white font-medium">8:00 – 13:00</span></li>
            <li className="flex justify-between gap-4"><span>Domingos</span><span className="text-brand-500 font-medium">Cerrado</span></li>
          </ul>
        </div>

        {/* Redes */}
        <div>
          <p className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">Redes sociales</p>
          <a
            href="#"
            className="flex items-center gap-2 text-sm text-brand-300 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
            @ConsultoriosEsperanza
          </a>
        </div>
      </div>

      <div className="border-t border-brand-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-brand-400">
          <span>© {new Date().getFullYear()} Consultorios Esperanza. Todos los derechos reservados.</span>
          <span>Desarrollado con ❤️ para tu salud</span>
        </div>
      </div>
    </footer>
  );
}
