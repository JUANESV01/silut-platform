import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../api/client';
import { SilutLogo } from '../components/ui/SilutLogo';

const CUENTAS_DEMO = [
  { rol: 'Administrador', correo: 'admin@lucytejada.pereira.gov.co', clave: 'Admin2026*' },
  { rol: 'Administrativo', correo: 'coordinacion@lucytejada.pereira.gov.co', clave: 'Coord2026*' },
  { rol: 'Educador (Danza)', correo: 'educador@lucytejada.pereira.gov.co', clave: 'Educador2026*' },
  { rol: 'Estudiante', correo: 'estudiante@lucytejada.pereira.gov.co', clave: 'Estudiante2026*' },
];

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [mostrarClave, setMostrarClave] = useState(false);
  const [codigoMfa, setCodigoMfa] = useState('');
  const [requiereMfa, setRequiereMfa] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarDemo, setMostrarDemo] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const res = await login(correo, clave, requiereMfa ? codigoMfa : undefined);
      if (res.mfaRequired) {
        setRequiereMfa(true);
        setCargando(false);
        return;
      }

      const u = res.usuario;
      if (u?.debeCambiarClave) {
        navigate('/cambiar-clave');
      } else if (u?.roles.includes('ADMINISTRADOR')) {
        navigate('/admin');
      } else if (u?.roles.includes('ADMINISTRATIVO')) {
        navigate('/dashboards');
      } else if (u?.roles.includes('EDUCADOR')) {
        navigate('/educador');
      } else {
        navigate('/estudiante');
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Credenciales inválidas'));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12">
      {/* Columna izquierda: formulario limpio sobre blanco puro */}
      <div className="lg:col-span-7 flex flex-col justify-center items-center px-6 py-12 bg-white">
        <div className="w-full max-w-[380px] space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Bienvenido a SILUT</h1>
            <p className="text-sm text-gray-500">
              Ingresa tus credenciales para acceder a tu portal académico o administrativo.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2.5 text-xs font-medium"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-correo" className="silut-label">
                Correo electrónico
              </label>
              <input
                id="login-correo"
                type="email"
                required
                autoComplete="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="nombre@lucytejada.pereira.gov.co"
                className="silut-input h-11"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-clave" className="text-xs font-medium text-gray-700">
                  Contraseña
                </label>
                <Link
                  to="/recuperar-clave"
                  className="text-xs font-medium text-brand-navy hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-clave"
                  type={mostrarClave ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  placeholder="••••••••"
                  className="silut-input h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarClave((v) => !v)}
                  aria-label={mostrarClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-700"
                >
                  {mostrarClave ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {requiereMfa && (
              <div className="rounded-lg bg-brand-navy-soft border border-brand-navy/15 p-4 space-y-2">
                <label
                  htmlFor="login-mfa"
                  className="flex items-center gap-1.5 text-xs font-semibold text-brand-navy"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Código de verificación 2FA
                </label>
                <input
                  id="login-mfa"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={codigoMfa}
                  onChange={(e) => setCodigoMfa(e.target.value)}
                  placeholder="000000"
                  className="silut-input text-center font-mono text-base tracking-[0.25em]"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="silut-btn-primary w-full h-11"
            >
              {cargando ? 'Verificando...' : requiereMfa ? 'Confirmar código' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500">
            ¿Eres estudiante nuevo?{' '}
            <Link to="/registro" className="font-semibold text-brand-navy hover:underline">
              Crea tu cuenta aquí
            </Link>
          </p>

          {/* Desplegable discreto para evaluación */}
          <div className="pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setMostrarDemo((v) => !v)}
              className="w-full py-2 flex items-center justify-between text-xs font-medium text-gray-500 hover:text-gray-800"
              aria-expanded={mostrarDemo}
            >
              <span>Accesos de prueba por rol</span>
              {mostrarDemo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {mostrarDemo && (
              <div className="mt-1 rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                {CUENTAS_DEMO.map((c) => (
                  <button
                    key={c.correo}
                    type="button"
                    onClick={() => {
                      setCorreo(c.correo);
                      setClave(c.clave);
                      setRequiereMfa(false);
                      setError('');
                    }}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between text-left bg-white hover:bg-gray-50 text-xs transition-colors"
                  >
                    <span className="font-medium text-gray-800">{c.rol}</span>
                    <span className="font-mono text-[11px] text-gray-500">{c.correo}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Columna derecha: panel arquitectónico claro y luminoso */}
      <div className="hidden lg:flex lg:col-span-5 bg-[#F4F6F9] border-l border-gray-200/80 flex-col justify-between p-12">
        <SilutLogo variant="full" size="md" />

        <div className="space-y-5 max-w-sm">
          <div className="w-10 h-0.5 bg-brand-gold" aria-hidden="true" />
          <h2 className="text-2xl font-semibold text-brand-navy leading-snug">
            Gestión académica y cultural unificada para Pereira.
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Danza, Teatro, Cuerdas Pulsadas, Cuerdas Sinfónicas, Banda Músico Marcial, Coros y
            Laboratorio de Artes Visuales en un entorno seguro, accesible y auditable.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Lock className="w-3.5 h-3.5 text-brand-navy" />
          <span>Cifrado TLS · Hash bcrypt · Cumplimiento Ley 1581 de 2012</span>
        </div>
      </div>
    </div>
  );
};
