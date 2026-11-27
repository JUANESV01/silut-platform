import React, { useEffect, useState, useCallback } from 'react';
import { Activity, Shield, UserPlus, Users } from 'lucide-react';
import { apiClient, extractErrorMessage } from '../api/client';
import { RoleName } from '../types';
import { MfaSettingsCard } from '../components/ui/MfaSettingsCard';
import { StatCard } from '../components/ui/Badges';

type TabAdmin = 'usuarios' | 'auditoria' | 'seguridad';

export const AdminSistemaPage: React.FC = () => {
  const [tab, setTab] = useState<TabAdmin>('usuarios');
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [auditoria, setAuditoria] = useState<any>({ items: [], total: 0, resumen: { fallidosUltimas24h: 0 } });
  const [health, setHealth] = useState<any>(null);
  const [filtroAud, setFiltroAud] = useState({ accion: '', correo: '', exitoso: '' });

  const [nuevoUsuario, setNuevoUsuario] = useState({
    correo: '',
    clave: 'Temporal2026*',
    rol: 'ADMINISTRATIVO' as RoleName,
    nombres: '',
    apellidos: '',
    documento: '',
    especialidad: '',
  });
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const cargarTodo = useCallback(async () => {
    try {
      const [uRes, hRes] = await Promise.all([
        apiClient.get('/usuarios'),
        apiClient.get('/health'),
      ]);
      setUsuarios(uRes.data);
      setHealth(hRes.data);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, []);

  const cargarAuditoria = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (filtroAud.accion) params.accion = filtroAud.accion;
      if (filtroAud.correo) params.correo = filtroAud.correo;
      if (filtroAud.exitoso) params.exitoso = filtroAud.exitoso;
      const { data } = await apiClient.get('/auditoria', { params });
      setAuditoria(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, [filtroAud]);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  useEffect(() => {
    if (tab === 'auditoria') cargarAuditoria();
  }, [tab, cargarAuditoria]);

  const crearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    try {
      await apiClient.post('/usuarios', {
        correo: nuevoUsuario.correo,
        clave: nuevoUsuario.clave,
        roles: [nuevoUsuario.rol],
        debeCambiarClave: true,
        nombres: nuevoUsuario.nombres || undefined,
        apellidos: nuevoUsuario.apellidos || undefined,
        documento: nuevoUsuario.documento || undefined,
        especialidad: nuevoUsuario.especialidad || undefined,
      });
      setMensaje(`Usuario ${nuevoUsuario.correo} creado con rol ${nuevoUsuario.rol}.`);
      setNuevoUsuario({
        correo: '',
        clave: 'Temporal2026*',
        rol: 'ADMINISTRATIVO',
        nombres: '',
        apellidos: '',
        documento: '',
        especialidad: '',
      });
      await cargarTodo();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const toggleActivo = async (u: any) => {
    try {
      await apiClient.patch(`/usuarios/${u.id}/rol`, {
        roles: u.roles,
        activo: !u.activo,
      });
      await cargarTodo();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usuarios, Roles y Auditoría</h1>
        <p className="text-xs text-gray-500 mt-1">
          Control de acceso RBAC, trazabilidad segura de eventos y estado del sistema.
        </p>
      </div>

      {health && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Estado de la API"
            value={health.status === 'ok' ? 'Operativo' : 'Degradado'}
            helper={`Uptime: ${Math.floor(health.uptimeSeconds / 60)} min`}
            icon={<Activity className="w-4 h-4" />}
          />
          <StatCard
            label="PostgreSQL / Caché"
            value={health.services.database.toUpperCase()}
            helper={`Caché: ${health.services.cache}`}
            icon={<Shield className="w-4 h-4" />}
          />
          <StatCard
            label="Cuentas registradas"
            value={usuarios.length}
            helper={`Fallidos (24h): ${auditoria.resumen?.fallidosUltimas24h ?? 0}`}
            icon={<Users className="w-4 h-4" />}
          />
        </div>
      )}

      <div role="tablist" className="flex flex-wrap gap-1 border-b border-gray-200">
        {[
          { id: 'usuarios', label: 'Usuarios y Roles' },
          { id: 'auditoria', label: 'Pistas de Auditoría' },
          { id: 'seguridad', label: 'Autenticación 2FA' },
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id as TabAdmin)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-brand-navy text-brand-navy'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
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

      {tab === 'usuarios' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={crearUsuario} className="silut-card p-6 space-y-3.5 h-fit">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-brand-navy" /> Nueva cuenta
            </h2>
            <input
              type="email"
              required
              placeholder="Correo electrónico"
              value={nuevoUsuario.correo}
              onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, correo: e.target.value })}
              className="silut-input"
            />
            <input
              required
              placeholder="Clave temporal"
              value={nuevoUsuario.clave}
              onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, clave: e.target.value })}
              className="silut-input font-mono text-xs"
            />
            <select
              value={nuevoUsuario.rol}
              onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value as RoleName })}
              className="silut-select"
            >
              <option value="ADMINISTRATIVO">Personal Administrativo</option>
              <option value="EDUCADOR">Educador</option>
              <option value="ADMINISTRADOR">Administrador</option>
            </select>
            {nuevoUsuario.rol === 'EDUCADOR' && (
              <div className="space-y-2.5 pt-1">
                <input
                  required
                  placeholder="Nombres"
                  value={nuevoUsuario.nombres}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombres: e.target.value })}
                  className="silut-input"
                />
                <input
                  required
                  placeholder="Apellidos"
                  value={nuevoUsuario.apellidos}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, apellidos: e.target.value })}
                  className="silut-input"
                />
                <input
                  required
                  placeholder="Documento"
                  value={nuevoUsuario.documento}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, documento: e.target.value })}
                  className="silut-input"
                />
                <input
                  placeholder="Especialidad"
                  value={nuevoUsuario.especialidad}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, especialidad: e.target.value })}
                  className="silut-input"
                />
              </div>
            )}
            <button type="submit" className="silut-btn-primary w-full">
              Crear cuenta
            </button>
          </form>

          <div className="lg:col-span-2 silut-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs font-medium text-gray-500 bg-gray-50/80 border-b border-gray-200">
                  <tr>
                    <th className="px-5 py-3">Usuario</th>
                    <th className="px-5 py-3">Roles</th>
                    <th className="px-5 py-3">2FA</th>
                    <th className="px-5 py-3">Estado</th>
                    <th className="px-5 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usuarios.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/60">
                      <td className="px-5 py-3.5 font-mono text-xs text-gray-900">{u.correo}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-600">{u.roles.join(', ')}</td>
                      <td className="px-5 py-3.5 text-xs">
                        {u.mfaActivo ? (
                          <span className="text-emerald-700 font-medium">Activo</span>
                        ) : (
                          <span className="text-gray-400">Inactivo</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${u.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {u.activo ? 'Activo' : 'Suspendido'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => toggleActivo(u)}
                          className="text-xs font-medium text-brand-navy hover:underline"
                        >
                          {u.activo ? 'Revocar' : 'Reactivar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'auditoria' && (
        <div className="silut-card p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              placeholder="Filtrar por acción (LOGIN, ACCESO_DENEGADO)..."
              value={filtroAud.accion}
              onChange={(e) => setFiltroAud({ ...filtroAud, accion: e.target.value })}
              className="silut-input"
            />
            <input
              placeholder="Filtrar por correo..."
              value={filtroAud.correo}
              onChange={(e) => setFiltroAud({ ...filtroAud, correo: e.target.value })}
              className="silut-input"
            />
            <select
              value={filtroAud.exitoso}
              onChange={(e) => setFiltroAud({ ...filtroAud, exitoso: e.target.value })}
              className="silut-select"
            >
              <option value="">Todos los resultados</option>
              <option value="true">Exitosos</option>
              <option value="false">Fallidos / Denegados</option>
            </select>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="text-gray-500 bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5">Fecha</th>
                  <th className="px-4 py-2.5">Usuario</th>
                  <th className="px-4 py-2.5">Acción</th>
                  <th className="px-4 py-2.5">Detalle</th>
                  <th className="px-4 py-2.5">IP</th>
                  <th className="px-4 py-2.5">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(auditoria.items || []).map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2.5 whitespace-nowrap text-gray-500">
                      {new Date(a.fecha).toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-gray-800">{a.usuarioCorreo || 'sistema'}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-900">{a.accion}</td>
                    <td className="px-4 py-2.5 text-gray-600 max-w-xs truncate">{a.detalle}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-500">{a.ip}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded font-medium ${a.exitoso ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {a.exitoso ? 'OK' : 'FALLIDO'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'seguridad' && <MfaSettingsCard />}
    </div>
  );
};
