import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { apiClient, extractErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const CambiarClavePage: React.FC = () => {
  const { actualizarSesion, usuario } = useAuth();
  const navigate = useNavigate();

  const [claveActual, setClaveActual] = useState('');
  const [claveNueva, setClaveNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const reglas = [
    { label: 'Mínimo 8 caracteres', ok: claveNueva.length >= 8 },
    { label: 'Una mayúscula (A-Z)', ok: /[A-Z]/.test(claveNueva) },
    { label: 'Una minúscula (a-z)', ok: /[a-z]/.test(claveNueva) },
    { label: 'Un número (0-9)', ok: /\d/.test(claveNueva) },
    { label: 'Carácter especial', ok: /[@$!%*?&.#_\-+]/.test(claveNueva) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (claveNueva !== confirmacion) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    setGuardando(true);
    try {
      const { data } = await apiClient.post('/auth/cambiar-clave', {
        claveActual,
        claveNueva,
      });
      actualizarSesion(data.accessToken, data.usuario);
      if (data.usuario.roles.includes('ADMINISTRADOR')) navigate('/admin');
      else if (data.usuario.roles.includes('ADMINISTRATIVO')) navigate('/dashboards');
      else if (data.usuario.roles.includes('EDUCADOR')) navigate('/educador');
      else navigate('/estudiante');
    } catch (err) {
      setError(extractErrorMessage(err, 'No se pudo actualizar la contraseña'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#F6F7F9]">
      <div className="w-full max-w-md silut-card p-8 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Define tu contraseña personal</h1>
          <p className="text-xs text-gray-500 mt-1">
            Cuenta: <span className="font-mono text-gray-700">{usuario?.correo}</span> · Por
            seguridad debes reemplazar la clave temporal en tu primer ingreso.
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2.5 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="cc-actual" className="silut-label">
              Contraseña temporal actual
            </label>
            <input
              id="cc-actual"
              type="password"
              required
              value={claveActual}
              onChange={(e) => setClaveActual(e.target.value)}
              className="silut-input h-11"
            />
          </div>
          <div>
            <label htmlFor="cc-nueva" className="silut-label">
              Nueva contraseña
            </label>
            <input
              id="cc-nueva"
              type="password"
              required
              value={claveNueva}
              onChange={(e) => setClaveNueva(e.target.value)}
              className="silut-input h-11"
            />
          </div>
          <div>
            <label htmlFor="cc-conf" className="silut-label">
              Confirmar nueva contraseña
            </label>
            <input
              id="cc-conf"
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

          <button type="submit" disabled={guardando} className="silut-btn-primary w-full h-11">
            {guardando ? 'Guardando...' : 'Guardar y continuar'}
          </button>
        </form>
      </div>
    </div>
  );
};
