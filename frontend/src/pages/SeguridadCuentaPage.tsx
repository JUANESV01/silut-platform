import React, { useState } from 'react';
import { Check, Shield } from 'lucide-react';
import { apiClient, extractErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { MfaSettingsCard } from '../components/ui/MfaSettingsCard';

export const SeguridadCuentaPage: React.FC = () => {
  const { usuario, actualizarSesion } = useAuth();
  const [claveActual, setClaveActual] = useState('');
  const [claveNueva, setClaveNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const reglas = [
    { label: 'Mínimo 8 caracteres', ok: claveNueva.length >= 8 },
    { label: 'Una mayúscula (A-Z)', ok: /[A-Z]/.test(claveNueva) },
    { label: 'Una minúscula (a-z)', ok: /[a-z]/.test(claveNueva) },
    { label: 'Un número (0-9)', ok: /\d/.test(claveNueva) },
    { label: 'Un carácter especial', ok: /[@$!%*?&.#_\-+]/.test(claveNueva) },
  ];

  const handleCambiarClave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    if (claveNueva !== confirmacion) {
      setError('La confirmación no coincide con la nueva contraseña.');
      return;
    }
    setGuardando(true);
    try {
      const { data } = await apiClient.post('/auth/cambiar-clave', {
        claveActual,
        claveNueva,
      });
      actualizarSesion(data.accessToken, data.usuario);
      setClaveActual('');
      setClaveNueva('');
      setConfirmacion('');
      setMensaje('Contraseña actualizada correctamente y registrada en auditoría.');
    } catch (err) {
      setError(extractErrorMessage(err, 'No se pudo cambiar la contraseña'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Seguridad de la Cuenta</h1>
        <p className="text-xs text-gray-500 mt-1">
          <span className="font-mono text-gray-700">{usuario?.correo}</span> ·{' '}
          {usuario?.roles.join(', ')}
        </p>
      </div>

      <div className="silut-card p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Cambiar contraseña</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Actualiza tu clave periódicamente bajo los estándares de seguridad de SILUT.
          </p>
        </div>

        {mensaje && (
          <div role="status" className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 text-sm">
            {mensaje}
          </div>
        )}
        {error && (
          <div role="alert" className="rounded-lg bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleCambiarClave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="seg-actual" className="silut-label">Contraseña actual *</label>
              <input
                id="seg-actual"
                type="password"
                required
                value={claveActual}
                onChange={(e) => setClaveActual(e.target.value)}
                className="silut-input"
              />
            </div>
            <div>
              <label htmlFor="seg-nueva" className="silut-label">Nueva contraseña *</label>
              <input
                id="seg-nueva"
                type="password"
                required
                value={claveNueva}
                onChange={(e) => setClaveNueva(e.target.value)}
                className="silut-input"
              />
            </div>
            <div>
              <label htmlFor="seg-conf" className="silut-label">Confirmar nueva *</label>
              <input
                id="seg-conf"
                type="password"
                required
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                className="silut-input"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1.5 bg-gray-50 rounded-lg px-4 py-3 text-xs">
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

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-gray-400 inline-flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Hash criptográfico bcrypt
            </span>
            <button type="submit" disabled={guardando} className="silut-btn-primary">
              {guardando ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </div>
        </form>
      </div>

      <MfaSettingsCard />
    </div>
  );
};
