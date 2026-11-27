import React from 'react';
import { Link } from 'react-router-dom';
import { SilutLogo } from '../components/ui/SilutLogo';

const SECCIONES = [
  { id: 'objeto', titulo: '1. Objeto y alcance' },
  { id: 'datos', titulo: '2. Protección de datos (Ley 1581)' },
  { id: 'menores', titulo: '3. Menores de edad' },
  { id: 'seguridad', titulo: '4. Seguridad y auditoría' },
  { id: 'derechos', titulo: '5. Derechos del titular' },
];

export const TerminosCondicionesPage: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Índice lateral pegajoso en escritorio */}
      <aside className="hidden lg:block lg:col-span-3 sticky top-24 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-2">
          Contenido
        </p>
        <nav aria-label="Índice de términos y condiciones" className="space-y-1">
          {SECCIONES.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="block px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-brand-navy hover:bg-white transition-colors"
            >
              {s.titulo}
            </a>
          ))}
        </nav>
      </aside>

      {/* Documento legal limpio sobre blanco */}
      <article className="lg:col-span-9 silut-card p-7 sm:p-10 space-y-8 text-sm text-gray-600 leading-relaxed">
        <header className="space-y-4 border-b border-gray-100 pb-6">
          <div className="flex items-center justify-between gap-4">
            <SilutLogo variant="full" size="sm" />
            <span className="text-xs text-gray-400">Versión 1.0 · Noviembre 2026</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Términos y Condiciones de Uso y Política de Tratamiento de Datos Personales
          </h1>
          <p>
            Condiciones generales aplicables a los usuarios de{' '}
            <strong className="text-gray-900">SILUT (Sistema de Información Lucy Tejada)</strong>,
            plataforma institucional del{' '}
            <strong className="text-gray-900">Centro Cultural Lucy Tejada de Pereira</strong>.
          </p>
        </header>

        <section id="objeto" className="space-y-2 scroll-mt-24">
          <h2 className="text-base font-semibold text-gray-900">1. Objeto y alcance del servicio</h2>
          <p>
            SILUT centraliza la inscripción, consulta académica, control de asistencia, evaluación
            cualitativa y analítica institucional para las siete líneas artísticas del Centro: Danza,
            Teatro, Cuerdas Pulsadas, Cuerdas Sinfónicas, Banda Músico Marcial, Coros y Laboratorio
            de Artes Visuales. La plataforma es pública y gratuita; no procesa pagos ni cobros en línea.
          </p>
        </section>

        <section id="datos" className="space-y-2 scroll-mt-24">
          <h2 className="text-base font-semibold text-gray-900">
            2. Protección de datos personales (Ley Estatutaria 1581 de 2012)
          </h2>
          <p>
            En cumplimiento de la <strong>Ley Estatutaria 1581 de 2012</strong>, el Decreto 1377 de
            2013 y el Decreto 1074 de 2015, el Centro Cultural Lucy Tejada trata los datos personales
            exclusivamente para finalidades académicas, administrativas, estadísticas y de
            comunicación institucional, bajo el principio de minimización y sin cesión comercial.
          </p>
        </section>

        <section id="menores" className="space-y-2 scroll-mt-24">
          <h2 className="text-base font-semibold text-gray-900">
            3. Protección reforzada para niños, niñas y adolescentes
          </h2>
          <p>
            Cuando el estudiante sea menor de dieciocho (18) años, el registro exige la
            identificación y autorización expresa de su representante legal o acudiente, velando por
            el interés superior del menor.
          </p>
        </section>

        <section id="seguridad" className="space-y-2 scroll-mt-24">
          <h2 className="text-base font-semibold text-gray-900">
            4. Seguridad de credenciales y trazabilidad
          </h2>
          <p>
            Las contraseñas se cifran con algoritmos de hash seguro (<code>bcrypt</code>), las
            comunicaciones operan sobre HTTPS/TLS, se dispone de autenticación en dos factores (2FA)
            y los registros de auditoría se almacenan redactando cualquier dato secreto o token.
          </p>
        </section>

        <section id="derechos" className="space-y-2 scroll-mt-24">
          <h2 className="text-base font-semibold text-gray-900">
            5. Derechos del titular (Habeas Data) y atención
          </h2>
          <p>
            Los titulares pueden conocer, actualizar, rectificar o revocar la autorización de sus
            datos desde su perfil en SILUT o en la sede del Centro Cultural Lucy Tejada (Carrera 10
            # 16-60, Pereira, Risaralda).
          </p>
        </section>

        <footer className="pt-6 border-t border-gray-100 flex items-center justify-between gap-4">
          <Link to="/" className="text-xs font-medium text-gray-500 hover:text-gray-900">
            ← Volver a la oferta formativa
          </Link>
          <Link to="/registro" className="silut-btn-primary h-9 text-xs">
            Ir al registro
          </Link>
        </footer>
      </article>
    </div>
  );
};
