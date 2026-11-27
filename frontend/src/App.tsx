import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RoleName } from './types';
import { Layout } from './components/ui/Layout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegistroEstudiantePage } from './pages/RegistroEstudiantePage';
import { RecuperarClavePage } from './pages/RecuperarClavePage';
import { TerminosCondicionesPage } from './pages/TerminosCondicionesPage';
import { CambiarClavePage } from './pages/CambiarClavePage';

// Code-splitting por módulo de rol para máxima velocidad de carga inicial
const EstudiantePortalPage = lazy(() =>
  import('./pages/EstudiantePortalPage').then((m) => ({ default: m.EstudiantePortalPage })),
);
const EducadorPortalPage = lazy(() =>
  import('./pages/EducadorPortalPage').then((m) => ({ default: m.EducadorPortalPage })),
);
const DashboardsPage = lazy(() =>
  import('./pages/DashboardsPage').then((m) => ({ default: m.DashboardsPage })),
);
const MatriculadosReportesPage = lazy(() =>
  import('./pages/MatriculadosReportesPage').then((m) => ({
    default: m.MatriculadosReportesPage,
  })),
);
const GestionAcademicaPage = lazy(() =>
  import('./pages/GestionAcademicaPage').then((m) => ({ default: m.GestionAcademicaPage })),
);
const AdminSistemaPage = lazy(() =>
  import('./pages/AdminSistemaPage').then((m) => ({ default: m.AdminSistemaPage })),
);
const SeguridadCuentaPage = lazy(() =>
  import('./pages/SeguridadCuentaPage').then((m) => ({ default: m.SeguridadCuentaPage })),
);

const PageLoader: React.FC = () => (
  <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500 text-sm">
    <div className="w-7 h-7 rounded-full border-2 border-slate-200 border-t-brand-navy animate-spin" />
    <span>Cargando módulo SILUT...</span>
  </div>
);

/**
 * Guarda de ruta por rol (Entrega 2, Figura 4: Enrutador y guardas de ruta).
 */
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  roles?: RoleName[];
  allowPendingPassword?: boolean;
}> = ({ children, roles, allowPendingPassword = false }) => {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return <PageLoader />;
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (usuario.debeCambiarClave && !allowPendingPassword) {
    return <Navigate to="/cambiar-clave" replace />;
  }

  if (roles && roles.length > 0 && !roles.some((r) => usuario.roles.includes(r))) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-3 shadow-xs">
        <h1 className="font-serif text-xl font-bold text-rose-900">Acceso restringido (403)</h1>
        <p className="text-sm text-slate-600">
          Tu perfil actual no cuenta con permisos para visualizar este módulo.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/registro" element={<RegistroEstudiantePage />} />
              <Route path="/recuperar-clave" element={<RecuperarClavePage />} />
              <Route path="/terminos" element={<TerminosCondicionesPage />} />
              <Route
                path="/cambiar-clave"
                element={
                  <ProtectedRoute allowPendingPassword>
                    <CambiarClavePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/seguridad"
                element={
                  <ProtectedRoute>
                    <SeguridadCuentaPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/estudiante"
                element={
                  <ProtectedRoute roles={['ESTUDIANTE']}>
                    <EstudiantePortalPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/educador"
                element={
                  <ProtectedRoute roles={['EDUCADOR', 'ADMINISTRATIVO', 'ADMINISTRADOR']}>
                    <EducadorPortalPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboards"
                element={
                  <ProtectedRoute roles={['ADMINISTRATIVO', 'ADMINISTRADOR']}>
                    <DashboardsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/matriculados"
                element={
                  <ProtectedRoute roles={['ADMINISTRATIVO', 'ADMINISTRADOR']}>
                    <MatriculadosReportesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/gestion-academica"
                element={
                  <ProtectedRoute roles={['ADMINISTRATIVO', 'ADMINISTRADOR']}>
                    <GestionAcademicaPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute roles={['ADMINISTRADOR']}>
                    <AdminSistemaPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
