import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { apiClient, extractErrorMessage } from '../api/client';

export const RecuperarClavePage: React.FC = () => {
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [claveNueva, setClaveNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [mostrarClave, setMostrarClave] = useState(false);
  const [codigoDemo, setCodigoDemo] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const reglas = [
    { label: 'Mínimo 8 caracteres', ok: claveNueva.length >= 8 },
    { label: 'Una mayúscula (A-Z)', ok: /[A-Z]/.test(claveNueva) },
    { label: 'Una minúscula (a-z)', ok: /[a-z]/.test(claveNueva) },
    { label: 'Un número (0-9)', ok: /\d/.test(claveNueva) },
    { label: 'Un carácter especial', ok: /[@$!%*?&.#_\-+]/.test(claveNueva) },
  ];

  const solicitarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const { data } = await apiClient.post('/auth/recuperar-clave', { correo });
      setMensaje(data.message);
      setCodigoDemo(data.codigoDemo || null);
      setPaso(2);
    } catch (err) {
      setError(extractErrorMessage(err, 'No se pudo procesar la solicitud'));
    } finally {
      setCargando(false);
    }
  };

  const restablecer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (claveNueva !== confirmacion) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setCargando(true);
    try {
      const { data } = await apiClient.post('/auth/restablecer-clave', {
        correo,
        codigo,
        claveNueva,
      });
      setMensaje(data.message);
      setPaso(3);
    } catch (err) {
      setError(extractErrorMessage(err, 'No se pudo restablecer la contraseña'));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#F6F7F9]">
      <div className="w-full max-w-md silut-card p-8 space-y-6">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-brand-gold uppercase tracking-wider">
            Paso {paso} de 3
          </p>
          <h1 className="text-xl font-bold text-gray-900">Recuperar contraseña</h1>
          <p className="text-xs text-gray-500">
            Restablece tu acceso de forma segura mediante un código temporal de un solo uso.
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2.5 text-xs">
            {error}
          </div>
        )}

        {paso === 1 && (
          <form onSubmit={solicitarCodigo} className="space-y-4">
            <div>
              <label htmlFor="rec-correo" className="silut-label">
                Correo electrónico registrado
              </label>
              <input
                id="rec-correo"
                type="email"
                required
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="usuario@lucytejada.pereira.gov.co"
                className="silut-input h-11"
              />
            </div>
            <button type="submit" disabled={cargando} className="silut-btn-primary w-full h-11">
              {cargando ? 'Generando código...' : 'Enviar código de verificación'}
            </button>
          </form>
        )}

        {paso === 2 && (
          <form onSubmit={restablecer} className="space-y-4">
            <div role="status" className="rounded-lg bg-brand-navy-soft border border-brand-navy/10 p-3.5 text-xs text-gray-700 space-y-1.5">
              <p>{mensaje}</p>
              {codigoDemo && (
                <p className="font-semibold text-brand-navy pt-1">
                  Código temporal (modo prueba sin SMTP):{' '}
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-gray-200">
                    {codigoDemo}
                  </span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="rec-codigo" className="silut-label">
                Código de 6 dígitos
              </label>
              <input
                id="rec-codigo"
                required
                maxLength={6}
                inputMode="numeric"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="000000"
                className="silut-input h-11 text-center font-mono text-base tracking-[0.25em]"
              />
            </div>

            <div>
              <label htmlFor="rec-nueva" className="silut-label">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  id="rec-nueva"
                  type={mostrarClave ? 'text' : 'password'}
                  required
                  value={claveNueva}
                  onChange={(e) => setClaveNueva(e.target.value)}
                  className="silut-input h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarClave((v) => !v)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-700"
                  aria-label="Alternar visibilidad"
                >
                  {mostrarClave ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="rec-conf" className="silut-label">
                Confirmar nueva contraseña
              </label>
              <input
                id="rec-conf"
                type="password"
                required
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                className="silut-input h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-1.5 bg-gray-50 rounded-lg p-3 text-[11px]">
              {reglas.map((r) => (
                <span
                  key={r.label}
                  className={`inline-flex items-center gap-1.5 ${
                    r.ok ? 'text-emerald-700 font-medium' : 'text-gray-500'
                  }`}
                >
                  <Check className={`w-3.5 h-3.5 ${r.ok ? 'text-emerald-600' : 'text-gray-300'}`} />
                  {r.label}
                </span>
              ))}
            </div>

            <button type="submit" disabled={cargando} className="silut-btn-primary w-full h-11">
              {cargando ? 'Restableciendo...' : 'Restablecer contraseña'}
            </button>
          </form>
        )}

        {paso === 3 && (
          <div className="text-center space-y-4 py-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <p className="text-sm text-gray-700">{mensaje}</p>
            <Link to="/login" className="silut-btn-primary w-full h-11">
              Ir a Iniciar Sesión
            </Link>
          </div>
        )}

        <div className="pt-3 border-t border-gray-100 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-brand-navy"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a Iniciar Sesión
          </Link>
        </div>
      </div>
    </div>
  );
};
