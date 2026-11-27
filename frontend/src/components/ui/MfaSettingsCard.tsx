import React, { useState } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { apiClient, extractErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const MfaSettingsCard: React.FC = () => {
  const { usuario, refrescarPerfil } = useAuth();
  const [setupData, setSetupData] = useState<{
    qrDataUrl: string;
    secret: string;
    codigoDemoActual: string;
  } | null>(null);
  const [codigo, setCodigo] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const iniciarConfiguracion = async () => {
    setError('');
    setMsg('');
    setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/mfa/configurar');
      setSetupData(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const activar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/auth/mfa/activar', { codigo });
      setSetupData(null);
      setCodigo('');
      setMsg('Autenticación en dos factores (2FA) activada correctamente.');
      await refrescarPerfil();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const desactivar = async () => {
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/auth/mfa/desactivar');
      setMsg('Autenticación 2FA desactivada.');
      await refrescarPerfil();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="silut-card p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-navy" />
            Autenticación en Dos Factores (2FA / TOTP)
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Estado:{' '}
            <strong className={usuario?.mfaActivo ? 'text-emerald-700' : 'text-gray-700'}>
              {usuario?.mfaActivo ? 'Activo' : 'Inactivo'}
            </strong>{' '}
            · Compatible con Google Authenticator y Authy
          </p>
        </div>

        {usuario?.mfaActivo ? (
          <button
            type="button"
            disabled={loading}
            onClick={desactivar}
            className="silut-btn-secondary h-9 text-xs text-rose-700 hover:bg-rose-50 hover:border-rose-200"
          >
            <ShieldOff className="w-3.5 h-3.5" /> Desactivar 2FA
          </button>
        ) : (
          !setupData && (
            <button
              type="button"
              disabled={loading}
              onClick={iniciarConfiguracion}
              className="silut-btn-primary h-9 text-xs"
            >
              Activar 2FA
            </button>
          )
        )}
      </div>

      {msg && (
        <div role="status" className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 text-xs">
          {msg}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-lg bg-rose-50 border border-rose-200 text-rose-800 px-4 py-2.5 text-xs">
          {error}
        </div>
      )}

      {setupData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-100 items-center">
          <div className="flex flex-col items-center gap-2.5 bg-gray-50 border border-gray-100 p-4 rounded-xl">
            <img
              src={setupData.qrDataUrl}
              alt="Código QR para configurar 2FA"
              className="w-40 h-40 rounded-lg border bg-white p-1"
            />
            <p className="text-[11px] font-mono text-gray-500 break-all text-center">
              {setupData.secret}
            </p>
            <p className="text-[11px] text-gray-700 bg-white px-2.5 py-1 rounded border border-gray-200">
              Código actual (demo): <strong className="font-mono">{setupData.codigoDemoActual}</strong>
            </p>
          </div>
          <form onSubmit={activar} className="space-y-3.5">
            <p className="text-xs text-gray-600 leading-relaxed">
              Escanea el código QR con tu aplicación autenticadora e ingresa el código de 6 dígitos
              para confirmar la activación.
            </p>
            <div>
              <label htmlFor="mfa-verify-code" className="silut-label">Código de 6 dígitos</label>
              <input
                id="mfa-verify-code"
                required
                maxLength={6}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="000000"
                className="silut-input text-center font-mono text-base tracking-[0.25em]"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="silut-btn-primary h-9 text-xs">
                Confirmar activación
              </button>
              <button
                type="button"
                onClick={() => setSetupData(null)}
                className="silut-btn-secondary h-9 text-xs"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
