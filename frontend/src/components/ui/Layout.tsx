import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Home,
  KeyRound,
  LogIn,
  LogOut,
  Menu,
  Shield,
  UserPlus,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SilutLogo } from './SilutLogo';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  show: boolean;
}

const AUTH_ROUTES = ['/login', '/registro', '/recuperar-clave', '/cambiar-clave'];

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Oferta Formativa',
  '/terminos': 'Términos y Privacidad',
  '/seguridad': 'Seguridad de la Cuenta',
  '/estudiante': 'Portal del Estudiante',
  '/educador': 'Portal del Educador',
  '/dashboards': 'Tableros Analíticos',
  '/matriculados': 'Matriculados y Reportes',
  '/gestion-academica': 'Programas y Migración',
  '/admin': 'Usuarios y Auditoría',
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { usuario, logout, tieneRol } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('silut_sidebar_collapsed') === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('silut_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isAuthPage = AUTH_ROUTES.includes(location.pathname);

  // Shell limpio sin barra lateral para páginas de autenticación (Login, Registro, Recuperar Clave)
  if (isAuthPage) {
    return (
      <div className="min-h-screen flex flex-col bg-white text-gray-900">
        <a href="#contenido-principal" className="skip-link">
          Saltar al contenido principal
        </a>
        <header className="h-16 border-b border-gray-100 px-6 flex items-center justify-between bg-white">
          <Link to="/" aria-label="Volver al inicio SILUT">
            <SilutLogo variant="full" size="sm" />
          </Link>
          <div className="flex items-center gap-4 text-xs font-medium text-gray-600">
            <Link to="/" className="hover:text-brand-navy transition-colors">
              Ver oferta formativa
            </Link>
            <Link to="/terminos" className="hover:text-brand-navy transition-colors">
              Términos y privacidad
            </Link>
          </div>
        </header>
        <main id="contenido-principal" className="flex-1 flex flex-col">
          {children}
        </main>
      </div>
    );
  }

  const institucionalItems: NavItem[] = [
    {
      to: '/',
      label: 'Oferta Formativa',
      icon: <Home className="w-[18px] h-[18px] shrink-0" />,
      show: true,
    },
    {
      to: '/terminos',
      label: 'Términos y Privacidad',
      icon: <FileText className="w-[18px] h-[18px] shrink-0" />,
      show: true,
    },
  ];

  const modulosRol: NavItem[] = [
    {
      to: '/estudiante',
      label: 'Mi Formación',
      icon: <GraduationCap className="w-[18px] h-[18px] shrink-0" />,
      show: tieneRol('ESTUDIANTE'),
    },
    {
      to: '/educador',
      label: 'Portal Educador',
      icon: <ClipboardCheck className="w-[18px] h-[18px] shrink-0" />,
      show: tieneRol('EDUCADOR'),
    },
    {
      to: '/dashboards',
      label: 'Dashboards',
      icon: <BarChart3 className="w-[18px] h-[18px] shrink-0" />,
      show: tieneRol('ADMINISTRATIVO', 'ADMINISTRADOR'),
    },
    {
      to: '/matriculados',
      label: 'Matriculados',
      icon: <FileSpreadsheet className="w-[18px] h-[18px] shrink-0" />,
      show: tieneRol('ADMINISTRATIVO', 'ADMINISTRADOR'),
    },
    {
      to: '/gestion-academica',
      label: 'Programas y Migración',
      icon: <BookOpen className="w-[18px] h-[18px] shrink-0" />,
      show: tieneRol('ADMINISTRATIVO', 'ADMINISTRADOR'),
    },
    {
      to: '/admin',
      label: 'Usuarios y Auditoría',
      icon: <Shield className="w-[18px] h-[18px] shrink-0" />,
      show: tieneRol('ADMINISTRADOR'),
    },
  ].filter((i) => i.show);

  const cuentaItems: NavItem[] = usuario
    ? [
        {
          to: '/seguridad',
          label: 'Seguridad y Clave',
          icon: <KeyRound className="w-[18px] h-[18px] shrink-0" />,
          show: true,
        },
      ]
    : [
        {
          to: '/login',
          label: 'Iniciar Sesión',
          icon: <LogIn className="w-[18px] h-[18px] shrink-0" />,
          show: true,
        },
        {
          to: '/registro',
          label: 'Registro Estudiante',
          icon: <UserPlus className="w-[18px] h-[18px] shrink-0" />,
          show: true,
        },
        {
          to: '/recuperar-clave',
          label: 'Recuperar Clave',
          icon: <KeyRound className="w-[18px] h-[18px] shrink-0" />,
          show: true,
        },
      ];

  const isRouteActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const currentTitle = ROUTE_TITLES[location.pathname] || 'SILUT';

  const renderSection = (title: string, items: NavItem[], compact: boolean) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1">
        {!compact && (
          <p className="px-3 pt-2 pb-1 text-[11px] font-medium text-gray-400">
            {title}
          </p>
        )}
        {items.map((item) => {
          const active = isRouteActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              title={compact ? item.label : undefined}
              aria-current={active ? 'page' : undefined}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-all ${
                compact ? 'justify-center px-0' : ''
              } ${
                active
                  ? 'bg-brand-navy-soft text-brand-navy font-semibold'
                  : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 font-medium'
              }`}
            >
              {active && !compact && (
                <span
                  className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-brand-navy"
                  aria-hidden="true"
                />
              )}
              <span className={active ? 'text-brand-navy' : 'text-gray-400 group-hover:text-gray-700'}>
                {item.icon}
              </span>
              {!compact && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-[#F6F7F9] text-gray-900">
      <a href="#contenido-principal" className="skip-link">
        Saltar al contenido principal
      </a>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-950/25 backdrop-blur-[2px] lg:hidden"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Barra lateral izquierda desplegable — blanca y limpia */}
      <aside
        aria-label="Menú lateral SILUT"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200/90 transition-all duration-200 ease-out
          ${mobileOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'lg:w-[72px]' : 'lg:w-64'}
        `}
      >
        <div className="h-16 px-4 flex items-center justify-between border-b border-gray-100 shrink-0">
          <Link to="/" className="min-w-0" aria-label="Inicio SILUT">
            <SilutLogo variant={collapsed && !mobileOpen ? 'mark' : 'full'} size="sm" />
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Cerrar menú lateral"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {renderSection('Institucional', institucionalItems, collapsed && !mobileOpen)}
          {renderSection('Módulos', modulosRol, collapsed && !mobileOpen)}
          {renderSection(usuario ? 'Cuenta' : 'Acceso', cuentaItems, collapsed && !mobileOpen)}
        </nav>

        {/* Pie del sidebar con usuario y control de colapsar */}
        <div className="border-t border-gray-100 p-3 space-y-2 shrink-0 bg-white">
          {usuario && (
            <div
              className={`flex items-center gap-2.5 p-2 rounded-lg bg-gray-50/90 border border-gray-100 ${
                collapsed && !mobileOpen ? 'justify-center' : ''
              }`}
            >
              <span className="w-8 h-8 rounded-lg bg-brand-navy text-white text-xs font-semibold flex items-center justify-center shrink-0">
                {usuario.nombreCompleto.slice(0, 2).toUpperCase()}
              </span>
              {!(collapsed && !mobileOpen) && (
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {usuario.nombreCompleto}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {usuario.roles[0]}
                  </p>
                </div>
              )}
              {!(collapsed && !mobileOpen) && (
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  className="p-1.5 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden lg:flex w-full items-center justify-center gap-2 h-8 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
            aria-label={collapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Ocultar menú</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Área de trabajo principal */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
        }`}
      >
        <header className="sticky top-0 z-30 h-16 bg-white/85 backdrop-blur-md border-b border-gray-200/80 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              aria-label="Abrir menú lateral"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="lg:hidden">
              <SilutLogo variant="compact" size="sm" />
            </div>
            <div className="hidden lg:flex items-center gap-2.5">
              <h2 className="text-[15px] font-semibold text-gray-900">{currentTitle}</h2>
              <span className="h-4 w-px bg-gray-200" aria-hidden="true" />
              <span className="text-xs text-gray-500">Centro Cultural Lucy Tejada · Pereira</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {usuario ? (
              <Link
                to="/seguridad"
                className="silut-btn-secondary h-9 text-xs px-3"
              >
                <KeyRound className="w-3.5 h-3.5 text-gray-500" />
                <span className="hidden sm:inline">Seguridad</span>
              </Link>
            ) : (
              <>
                <Link to="/login" className="silut-btn-ghost text-xs">
                  Iniciar sesión
                </Link>
                <Link to="/registro" className="silut-btn-primary h-9 text-xs px-3.5">
                  Inscribirme
                </Link>
              </>
            )}
          </div>
        </header>

        {usuario?.mfaRecomendado && (
          <div
            role="status"
            className="bg-brand-gold-soft border-b border-amber-200/70 px-4 sm:px-8 py-2.5 text-xs text-gray-700"
          >
            <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
              <span>
                Recomendación institucional: activa la verificación en dos pasos (2FA) en tu cuenta administrativa.
              </span>
              <Link to="/seguridad" className="font-semibold text-brand-navy hover:underline">
                Activar 2FA →
              </Link>
            </div>
          </div>
        )}

        <main
          id="contenido-principal"
          className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-7"
        >
          {children}
        </main>

        <footer className="bg-white border-t border-gray-200/80 mt-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-2.5">
              <SilutLogo variant="mark" size="sm" />
              <span>
                <strong className="font-semibold text-gray-800">SILUT</strong> · Centro Cultural
                Lucy Tejada · Pereira, Colombia
              </span>
            </div>
            <div className="flex items-center gap-5">
              <Link to="/terminos" className="hover:text-brand-navy transition-colors">
                Términos y Privacidad
              </Link>
              <Link to="/recuperar-clave" className="hover:text-brand-navy transition-colors">
                Recuperar contraseña
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
