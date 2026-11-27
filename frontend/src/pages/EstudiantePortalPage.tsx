import React, { useEffect, useState, useCallback } from 'react';
import {
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  MapPin,
  User,
} from 'lucide-react';
import { apiClient, extractErrorMessage } from '../api/client';
import { BarrioPereira, ProgramaPublico } from '../types';
import { ConceptoBadge, StatCard } from '../components/ui/Badges';
import { MfaSettingsCard } from '../components/ui/MfaSettingsCard';

type TabEstudiante = 'academico' | 'inscribir' | 'perfil' | 'notificaciones';

export const EstudiantePortalPage: React.FC = () => {
  const [tab, setTab] = useState<TabEstudiante>('academico');
  const [resumen, setResumen] = useState<any>(null);
  const [programas, setProgramas] = useState<ProgramaPublico[]>([]);
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [barrios, setBarrios] = useState<BarrioPereira[]>([]);
  const [ciudades, setCiudades] = useState<string[]>([]);
  const [perfilForm, setPerfilForm] = useState({
    telefono: '',
    direccion: '',
    barrio: '',
    comuna: '',
    ciudadOrigen: '',
    acudienteTelefono: '',
  });
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  const cargarTodo = useCallback(async () => {
    setCargando(true);
    try {
      const [meRes, progRes, notifRes, catRes] = await Promise.all([
        apiClient.get('/estudiantes/me'),
        apiClient.get<ProgramaPublico[]>('/programas'),
        apiClient.get('/notificaciones/mias'),
        apiClient.get('/estudiantes/catalogos/ubicacion'),
      ]);
      setResumen(meRes.data);
      setProgramas(progRes.data);
      setNotificaciones(notifRes.data);
      setBarrios(catRes.data.barrios || []);
      setCiudades(catRes.data.ciudades || []);
      const est = meRes.data.estudiante;
      setPerfilForm({
        telefono: est.telefono || '',
        direccion: est.direccion || '',
        barrio: est.barrio || '',
        comuna: est.comuna || '',
        ciudadOrigen: est.ciudadOrigen || '',
        acudienteTelefono: est.acudienteTelefono || '',
      });
    } catch (err) {
      setError(extractErrorMessage(err, 'Error cargando información académica'));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  const inscribirEnGrupo = async (grupoId: string) => {
    setMensaje('');
    setError('');
    try {
      const { data } = await apiClient.post('/inscripciones', { grupoId });
      setMensaje(data.mensaje || 'Matrícula confirmada exitosamente.');
      await cargarTodo();
      setTab('academico');
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const cancelarInscripcion = async (inscripcionId: string) => {
    if (!window.confirm('¿Deseas cancelar esta matrícula? El cupo quedará liberado.')) return;
    setMensaje('');
    setError('');
    try {
      await apiClient.patch(`/inscripciones/${inscripcionId}/cancelar`, {
        motivo: 'Cancelado autónomamente por el estudiante',
      });
      setMensaje('Matrícula cancelada correctamente.');
      await cargarTodo();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const guardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    try {
      await apiClient.patch('/estudiantes/me', perfilForm);
      setMensaje('Datos de contacto y residencia actualizados.');
      await cargarTodo();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const marcarLeida = async (id: string) => {
    await apiClient.patch(`/notificaciones/${id}/leida`);
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n)),
    );
  };

  if (cargando) {
    return <div className="py-12 text-center text-sm text-gray-500">Cargando tu portal académico...</div>;
  }

  const est = resumen?.estudiante;
  const inscripcionesActivas = (resumen?.inscripciones || []).filter(
    (i: any) => i.estado === 'ACTIVA',
  );
  const noLeidas = notificaciones.filter((n) => !n.leida).length;
  const promedioAsist =
    inscripcionesActivas.length > 0
      ? Math.round(
          inscripcionesActivas.reduce(
            (s: number, i: any) => s + (i.asistenciaResumen?.porcentajeAsistencia || 100),
            0,
          ) / inscripcionesActivas.length,
        )
      : 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {est?.nombres} {est?.apellidos}
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          {est?.tipoDocumento} {est?.documento} · {est?.barrio}, {est?.ciudadOrigen}
          {est?.esMenor ? ' · Menor de edad con acudiente registrado' : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Programas activos"
          value={inscripcionesActivas.length}
          helper="Periodo 2026-2"
          icon={<BookOpen className="w-4 h-4" />}
        />
        <StatCard
          label="Asistencia promedio"
          value={`${promedioAsist}%`}
          helper="Sesiones registradas"
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <StatCard
          label="Notificaciones nuevas"
          value={noLeidas}
          helper="Avisos académicos"
          icon={<Bell className="w-4 h-4" />}
        />
      </div>

      <div role="tablist" aria-label="Secciones del estudiante" className="flex flex-wrap gap-1 border-b border-gray-200">
        {[
          { id: 'academico', label: 'Mi Formación' },
          { id: 'inscribir', label: 'Inscripción a Programas' },
          { id: 'perfil', label: 'Datos Personales y 2FA' },
          { id: 'notificaciones', label: `Notificaciones (${noLeidas})` },
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id as TabEstudiante)}
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

      {tab === 'academico' && (
        <div className="space-y-5">
          {inscripcionesActivas.length === 0 ? (
            <div className="silut-card p-10 text-center space-y-3">
              <p className="text-sm text-gray-600">
                Aún no tienes matrículas activas en este periodo.
              </p>
              <button
                type="button"
                onClick={() => setTab('inscribir')}
                className="silut-btn-primary"
              >
                Explorar programas disponibles
              </button>
            </div>
          ) : (
            inscripcionesActivas.map((insc: any) => (
              <article key={insc.id} className="silut-card p-6 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-4">
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-brand-gold">
                      {insc.programa?.nombre} · {insc.grupo?.periodo}
                    </span>
                    <h2 className="text-lg font-semibold text-gray-900">{insc.grupo?.nombre}</h2>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-1">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        {insc.educador}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {insc.salon?.nombre} ({insc.salon?.ubicacion})
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {insc.horarios
                          .map((h: any) => `${h.diaSemana} ${h.horaInicio}-${h.horaFin}`)
                          .join(' · ')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Asistencia</p>
                      <p className="text-lg font-semibold text-gray-900 tabular-nums">
                        {insc.asistenciaResumen.porcentajeAsistencia}%
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {insc.asistenciaResumen.presentes}P · {insc.asistenciaResumen.excusados}E ·{' '}
                        {insc.asistenciaResumen.ausentes}A
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => cancelarInscripcion(insc.id)}
                      className="silut-btn-secondary h-8 px-3 text-xs text-rose-700 hover:bg-rose-50 hover:border-rose-200"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    Evaluación Cualitativa por Indicadores
                  </h3>
                  {insc.evaluaciones.length === 0 ? (
                    <p className="text-xs text-gray-400">
                      Tu educador aún no ha registrado conceptos cualitativos en este periodo.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {insc.evaluaciones.map((ev: any) => (
                        <div
                          key={ev.id}
                          className="rounded-lg border border-gray-100 bg-gray-50/70 p-3.5 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-gray-900">{ev.indicador}</p>
                            <ConceptoBadge concepto={ev.concepto} />
                          </div>
                          {ev.observacion && (
                            <p className="text-xs text-gray-600 leading-relaxed">{ev.observacion}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {tab === 'inscribir' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {programas.map((prog) => (
            <div key={prog.id} className="silut-card p-6 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{prog.nombre}</h2>
                <p className="text-xs text-gray-500 mt-1">{prog.descripcion}</p>
              </div>
              <div className="space-y-2.5">
                {prog.grupos
                  .filter((g) => g.activo)
                  .map((g) => {
                    const yaInscrito = inscripcionesActivas.some((i: any) => i.grupo?.id === g.id);
                    const sinCupo = g.cuposDisponibles <= 0;
                    return (
                      <div
                        key={g.id}
                        className="rounded-lg border border-gray-200/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/40"
                      >
                        <div className="text-xs space-y-0.5">
                          <p className="font-semibold text-gray-900 text-sm">{g.nombre}</p>
                          <p className="text-gray-500">
                            {g.educador?.nombreCompleto} · {g.salon?.nombre}
                          </p>
                          <p className="text-gray-400">
                            {g.horarios
                              .map((h) => `${h.diaSemana} ${h.horaInicio}-${h.horaFin}`)
                              .join(' · ')}
                          </p>
                          <p className={sinCupo ? 'text-rose-700 font-medium' : 'text-brand-navy font-medium'}>
                            {g.cuposDisponibles} cupos disponibles de {g.cupoMax}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={yaInscrito || sinCupo}
                          onClick={() => inscribirEnGrupo(g.id)}
                          className="silut-btn-primary h-9 px-3.5 text-xs shrink-0"
                        >
                          {yaInscrito ? 'Matriculado' : sinCupo ? 'Sin cupo' : 'Matricularme'}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'perfil' && (
        <div className="space-y-6">
          <form onSubmit={guardarPerfil} className="silut-card p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">
              Actualizar datos de contacto y residencia
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="perf-tel" className="silut-label">Teléfono celular</label>
                <input
                  id="perf-tel"
                  required
                  value={perfilForm.telefono}
                  onChange={(e) => setPerfilForm({ ...perfilForm, telefono: e.target.value })}
                  className="silut-input"
                />
              </div>
              <div>
                <label htmlFor="perf-dir" className="silut-label">Dirección</label>
                <input
                  id="perf-dir"
                  required
                  value={perfilForm.direccion}
                  onChange={(e) => setPerfilForm({ ...perfilForm, direccion: e.target.value })}
                  className="silut-input"
                />
              </div>
              <div>
                <label htmlFor="perf-barrio" className="silut-label">Barrio de Pereira</label>
                <select
                  id="perf-barrio"
                  value={perfilForm.barrio}
                  onChange={(e) => {
                    const match = barrios.find((b) => b.barrio === e.target.value);
                    setPerfilForm({
                      ...perfilForm,
                      barrio: e.target.value,
                      comuna: match?.comuna || perfilForm.comuna,
                    });
                  }}
                  className="silut-select"
                >
                  {barrios.map((b) => (
                    <option key={b.barrio} value={b.barrio}>
                      {b.barrio} ({b.comuna})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="perf-ciudad" className="silut-label">Ciudad de origen</label>
                <select
                  id="perf-ciudad"
                  value={perfilForm.ciudadOrigen}
                  onChange={(e) => setPerfilForm({ ...perfilForm, ciudadOrigen: e.target.value })}
                  className="silut-select"
                >
                  {ciudades.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {est?.esMenor && (
                <div>
                  <label htmlFor="perf-acutel" className="silut-label">
                    Teléfono del acudiente ({est.acudienteNombre})
                  </label>
                  <input
                    id="perf-acutel"
                    value={perfilForm.acudienteTelefono}
                    onChange={(e) =>
                      setPerfilForm({ ...perfilForm, acudienteTelefono: e.target.value })
                    }
                    className="silut-input"
                  />
                </div>
              )}
            </div>
            <div className="pt-2">
              <button type="submit" className="silut-btn-primary">
                Guardar cambios
              </button>
            </div>
          </form>

          <MfaSettingsCard />
        </div>
      )}

      {tab === 'notificaciones' && (
        <div className="silut-card divide-y divide-gray-100 overflow-hidden">
          {notificaciones.length === 0 ? (
            <p className="p-10 text-center text-sm text-gray-500">
              No tienes notificaciones registradas aún.
            </p>
          ) : (
            notificaciones.map((n) => (
              <div
                key={n.id}
                className={`p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                  n.leida ? 'bg-white' : 'bg-brand-navy-soft/40'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                      {n.tipo}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(n.creadaEn).toLocaleString('es-CO')}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">{n.asunto}</h3>
                  <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">{n.mensaje}</p>
                </div>
                {!n.leida && (
                  <button
                    type="button"
                    onClick={() => marcarLeida(n.id)}
                    className="text-xs font-medium text-brand-navy hover:underline shrink-0"
                  >
                    Marcar leída
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
