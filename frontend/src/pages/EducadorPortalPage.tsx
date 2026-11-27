import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Calendar, CheckCircle2, Users } from 'lucide-react';
import { apiClient, extractErrorMessage } from '../api/client';
import { ConceptoEvaluacion, EstadoAsistencia } from '../types';
import { ConceptoBadge } from '../components/ui/Badges';

type TabEdu = 'asistencia' | 'reporte' | 'evaluacion';

export const EducadorPortalPage: React.FC = () => {
  const [grupos, setGrupos] = useState<any[]>([]);
  const [grupoId, setGrupoId] = useState<string>('');
  const [tab, setTab] = useState<TabEdu>('asistencia');
  const [sesiones, setSesiones] = useState<any[]>([]);
  const [fechaSesion, setFechaSesion] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [temaSesion, setTemaSesion] = useState('Práctica formativa semanal');
  const [sesionActiva, setSesionActiva] = useState<any>(null);
  const [marcas, setMarcas] = useState<Record<string, EstadoAsistencia>>({});
  const [reporteGrupo, setReporteGrupo] = useState<any>(null);
  const [evaluacionesGrupo, setEvaluacionesGrupo] = useState<any[]>([]);
  const [evalForm, setEvalForm] = useState<{
    inscripcionId: string;
    indicadorId: string;
    concepto: ConceptoEvaluacion;
    observacion: string;
  }>({
    inscripcionId: '',
    indicadorId: '',
    concepto: 'DESTACADO',
    observacion: '',
  });
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  const grupoActual = grupos.find((g) => g.id === grupoId) || null;

  const cargarGrupos = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await apiClient.get('/grupos/mis-grupos');
      setGrupos(data);
      if (data.length > 0) {
        setGrupoId((prev) => prev || data[0].id);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarGrupos();
  }, [cargarGrupos]);

  const cargarDatosGrupo = useCallback(async (gId: string) => {
    if (!gId) return;
    try {
      const [sesRes, repRes, evRes] = await Promise.all([
        apiClient.get(`/grupos/${gId}/sesiones`),
        apiClient.get(`/grupos/${gId}/reporte-asistencia`),
        apiClient.get(`/evaluaciones/grupo/${gId}`),
      ]);
      setSesiones(sesRes.data);
      setReporteGrupo(repRes.data);
      setEvaluacionesGrupo(evRes.data);
      if (sesRes.data.length > 0) {
        seleccionarSesion(sesRes.data[0]);
      } else {
        setSesionActiva(null);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    if (grupoId) {
      cargarDatosGrupo(grupoId);
    }
  }, [grupoId, cargarDatosGrupo]);

  const seleccionarSesion = (sesion: any) => {
    setSesionActiva(sesion);
    const map: Record<string, EstadoAsistencia> = {};
    for (const a of sesion.asistencias || []) {
      map[a.inscripcionId] = a.estado;
    }
    setMarcas(map);
  };

  const abrirOCrearSesion = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    try {
      const { data } = await apiClient.post('/sesiones', {
        grupoId,
        fecha: fechaSesion,
        tema: temaSesion,
      });
      await cargarDatosGrupo(grupoId);
      seleccionarSesion(data);
      setMensaje(`Sesión del ${data.fecha} lista para registrar asistencia.`);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const guardarAsistencia = async () => {
    if (!sesionActiva || !grupoActual) return;
    setMensaje('');
    setError('');
    try {
      const registros = grupoActual.estudiantes.map((est: any) => ({
        inscripcionId: est.inscripcionId,
        estado: marcas[est.inscripcionId] || 'PRESENTE',
      }));
      const { data } = await apiClient.put(`/sesiones/${sesionActiva.id}/asistencia`, {
        registros,
      });
      setMensaje(
        `Asistencia guardada (${data.totalRegistrados} registros).${
          data.alertasGeneradas > 0
            ? ` Se generaron ${data.alertasGeneradas} alerta(s) por inasistencia reiterada.`
            : ''
        }`,
      );
      await cargarDatosGrupo(grupoId);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const guardarEvaluacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    try {
      await apiClient.post('/evaluaciones', evalForm);
      setMensaje('Evaluación cualitativa registrada.');
      setEvalForm((prev) => ({ ...prev, observacion: '' }));
      await cargarDatosGrupo(grupoId);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  if (cargando) {
    return <div className="py-12 text-center text-sm text-gray-500">Cargando grupos asignados...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión Docente</h1>
          <p className="text-xs text-gray-500 mt-1">
            Control de asistencia por sesión, consolidados y evaluación cualitativa.
          </p>
        </div>
        {grupos.length > 0 && (
          <div className="w-full md:w-80">
            <label htmlFor="edu-grupo-select" className="sr-only">Grupo asignado</label>
            <select
              id="edu-grupo-select"
              value={grupoId}
              onChange={(e) => setGrupoId(e.target.value)}
              className="silut-select font-medium"
            >
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.programa?.nombre} — {g.nombre} ({g.estudiantes.length} est.)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {grupoActual && (
        <div className="silut-card px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold text-gray-900">{grupoActual.nombre}</h2>
            <p className="text-xs text-gray-500">
              {grupoActual.programa?.nombre} · {grupoActual.salon?.nombre} ·{' '}
              {(grupoActual.horarios || [])
                .map((h: any) => `${h.diaSemana} ${h.horaInicio}-${h.horaFin}`)
                .join(' · ')}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-navy bg-brand-navy-soft px-3 py-1.5 rounded-lg">
            <Users className="w-3.5 h-3.5" />
            {grupoActual.estudiantes.length} / {grupoActual.cupoMax} estudiantes
          </span>
        </div>
      )}

      <div role="tablist" className="flex flex-wrap gap-1 border-b border-gray-200">
        {[
          { id: 'asistencia', label: 'Control de Asistencia' },
          { id: 'reporte', label: 'Reporte de Asistencia' },
          { id: 'evaluacion', label: 'Evaluación Cualitativa' },
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id as TabEdu)}
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

      {tab === 'asistencia' && grupoActual && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <form onSubmit={abrirOCrearSesion} className="silut-card p-5 space-y-3.5">
              <h3 className="text-sm font-semibold text-gray-900">Nueva sesión de clase</h3>
              <div>
                <label htmlFor="ses-fecha" className="silut-label">Fecha (no futura)</label>
                <input
                  id="ses-fecha"
                  type="date"
                  required
                  max={new Date().toISOString().slice(0, 10)}
                  value={fechaSesion}
                  onChange={(e) => setFechaSesion(e.target.value)}
                  className="silut-input"
                />
              </div>
              <div>
                <label htmlFor="ses-tema" className="silut-label">Tema de la jornada</label>
                <input
                  id="ses-tema"
                  value={temaSesion}
                  onChange={(e) => setTemaSesion(e.target.value)}
                  className="silut-input"
                />
              </div>
              <button type="submit" className="silut-btn-primary w-full">
                Abrir / Crear sesión
              </button>
            </form>

            <div className="silut-card p-5 space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Sesiones registradas ({sesiones.length})
              </h3>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {sesiones.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => seleccionarSesion(s)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs border transition-colors ${
                      sesionActiva?.id === s.id
                        ? 'bg-brand-navy text-white border-brand-navy'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> {s.fecha}
                      </span>
                      <span>{(s.asistencias || []).length} reg.</span>
                    </div>
                    {s.tema && <p className="truncate opacity-80 mt-0.5">{s.tema}</p>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 silut-card p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Listado de Asistencia {sesionActiva ? `· ${sesionActiva.fecha}` : ''}
                </h3>
                <p className="text-xs text-gray-500">
                  Marca el estado de cada estudiante y guarda en lote.
                </p>
              </div>
              {sesionActiva && (
                <button type="button" onClick={guardarAsistencia} className="silut-btn-primary h-9 text-xs">
                  <CheckCircle2 className="w-4 h-4" /> Guardar asistencia
                </button>
              )}
            </div>

            {!sesionActiva ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                Selecciona o crea una sesión para tomar asistencia.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs font-medium text-gray-500 bg-gray-50/80 border-b border-gray-200">
                    <tr>
                      <th scope="col" className="px-4 py-2.5">Estudiante</th>
                      <th scope="col" className="px-4 py-2.5">Documento</th>
                      <th scope="col" className="px-4 py-2.5">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {grupoActual.estudiantes.map((est: any) => {
                      const estado = marcas[est.inscripcionId] || 'PRESENTE';
                      return (
                        <tr key={est.inscripcionId}>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {est.nombres} {est.apellidos}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">
                            {est.documento}
                          </td>
                          <td className="px-4 py-3">
                            <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden bg-white">
                              {(['PRESENTE', 'AUSENTE', 'EXCUSADO'] as EstadoAsistencia[]).map(
                                (op) => (
                                  <button
                                    key={op}
                                    type="button"
                                    onClick={() =>
                                      setMarcas((prev) => ({
                                        ...prev,
                                        [est.inscripcionId]: op,
                                      }))
                                    }
                                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                                      estado === op
                                        ? op === 'PRESENTE'
                                          ? 'bg-emerald-600 text-white'
                                          : op === 'AUSENTE'
                                            ? 'bg-rose-600 text-white'
                                            : 'bg-amber-500 text-white'
                                        : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                  >
                                    {op === 'PRESENTE'
                                      ? 'Presente'
                                      : op === 'AUSENTE'
                                        ? 'Ausente'
                                        : 'Excusado'}
                                  </button>
                                ),
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'reporte' && reporteGrupo && (
        <div className="silut-card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Consolidado de Asistencia · {reporteGrupo.grupo.nombre}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {reporteGrupo.totalSesiones} sesiones · Promedio:{' '}
                <strong className="text-gray-900">{reporteGrupo.promedioAsistenciaGrupo}%</strong>
              </p>
            </div>
            {reporteGrupo.estudiantesEnRiesgo > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20 text-xs font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                {reporteGrupo.estudiantesEnRiesgo} en riesgo de deserción
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs font-medium text-gray-500 bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Estudiante</th>
                  <th className="px-6 py-3">Presentes</th>
                  <th className="px-6 py-3">Excusados</th>
                  <th className="px-6 py-3">Ausentes</th>
                  <th className="px-6 py-3">% Asistencia</th>
                  <th className="px-6 py-3">Seguimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reporteGrupo.estudiantes.map((e: any) => (
                  <tr key={e.inscripcionId} className="hover:bg-gray-50/60">
                    <td className="px-6 py-3.5 font-medium text-gray-900">{e.nombreCompleto}</td>
                    <td className="px-6 py-3.5 text-emerald-700 font-medium">{e.presentes}</td>
                    <td className="px-6 py-3.5 text-amber-700 font-medium">{e.excusados}</td>
                    <td className="px-6 py-3.5 text-rose-700 font-medium">{e.ausentes}</td>
                    <td className="px-6 py-3.5 font-semibold text-gray-900">{e.porcentajeAsistencia}%</td>
                    <td className="px-6 py-3.5">
                      {e.enRiesgoDesercion ? (
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-xs font-medium">
                          Riesgo ({e.inasistenciasConsecutivas} faltas)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium">
                          Regular
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'evaluacion' && grupoActual && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={guardarEvaluacion} className="silut-card p-6 space-y-4 h-fit">
            <h3 className="text-base font-semibold text-gray-900">
              Registrar evaluación cualitativa
            </h3>
            <div>
              <label htmlFor="ev-est" className="silut-label">Estudiante *</label>
              <select
                id="ev-est"
                required
                value={evalForm.inscripcionId}
                onChange={(e) => setEvalForm({ ...evalForm, inscripcionId: e.target.value })}
                className="silut-select"
              >
                <option value="">Selecciona estudiante...</option>
                {grupoActual.estudiantes.map((est: any) => (
                  <option key={est.inscripcionId} value={est.inscripcionId}>
                    {est.nombres} {est.apellidos}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ev-ind" className="silut-label">Indicador *</label>
              <select
                id="ev-ind"
                required
                value={evalForm.indicadorId}
                onChange={(e) => setEvalForm({ ...evalForm, indicadorId: e.target.value })}
                className="silut-select"
              >
                <option value="">Selecciona indicador...</option>
                {(grupoActual.programa?.indicadores || []).map((ind: any) => (
                  <option key={ind.id} value={ind.id}>{ind.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ev-con" className="silut-label">Nivel cualitativo *</label>
              <select
                id="ev-con"
                value={evalForm.concepto}
                onChange={(e) =>
                  setEvalForm({ ...evalForm, concepto: e.target.value as ConceptoEvaluacion })
                }
                className="silut-select"
              >
                <option value="INICIAL">Inicial</option>
                <option value="EN_PROCESO">En Proceso</option>
                <option value="DESTACADO">Destacado</option>
                <option value="SOBRESALIENTE">Sobresaliente</option>
              </select>
            </div>
            <div>
              <label htmlFor="ev-obs" className="silut-label">Observación pedagógica</label>
              <textarea
                id="ev-obs"
                rows={3}
                value={evalForm.observacion}
                onChange={(e) => setEvalForm({ ...evalForm, observacion: e.target.value })}
                placeholder="Logros y recomendaciones formativas..."
                className="silut-textarea"
              />
            </div>
            <button type="submit" className="silut-btn-primary w-full">
              Guardar valoración
            </button>
          </form>

          <div className="lg:col-span-2 silut-card p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">
              Historial de Evaluaciones del Grupo
            </h3>
            <div className="space-y-3.5">
              {evaluacionesGrupo.map((row) => (
                <div key={row.inscripcionId} className="rounded-lg border border-gray-200/80 p-4 space-y-2.5">
                  <p className="font-semibold text-gray-900 text-sm">
                    {row.nombreCompleto}{' '}
                    <span className="font-mono text-xs text-gray-400">({row.documento})</span>
                  </p>
                  {row.evaluaciones.length === 0 ? (
                    <p className="text-xs text-gray-400">Sin evaluaciones aún.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {row.evaluaciones.map((ev: any) => (
                        <div key={ev.id} className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-gray-900">{ev.indicadorNombre}</span>
                            <ConceptoBadge concepto={ev.concepto} />
                          </div>
                          {ev.observacion && <p className="text-gray-600">{ev.observacion}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
