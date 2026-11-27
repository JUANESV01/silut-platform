import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  RefreshCw,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiClient, extractErrorMessage } from '../api/client';
import { StatCard } from '../components/ui/Badges';
import { PereiraMap } from '../components/PereiraMap';

const CHART_COLORS = ['#0F2440', '#B0843B', '#335C85', '#2A7B6F', '#6B7280', '#D2A75E', '#8C3B4A'];

const TOOLTIP_STYLE = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  borderRadius: '10px',
  boxShadow: '0 4px 12px rgba(15, 36, 64, 0.08)',
  fontSize: '12px',
};

type DashboardTab =
  | 'matricula'
  | 'geografico'
  | 'asistencia'
  | 'evaluaciones'
  | 'programas'
  | 'desercion';

export const DashboardsPage: React.FC = () => {
  const [tab, setTab] = useState<DashboardTab>('matricula');
  const [resumen, setResumen] = useState<any>(null);
  const [datos, setDatos] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargarDashboard = useCallback(
    async (tipo: DashboardTab, forceRefresh = false) => {
      setCargando(true);
      setError('');
      try {
        const suffix = forceRefresh ? '?refresh=true' : '';
        const [resKpis, resDash] = await Promise.all([
          apiClient.get(`/dashboards/resumen${suffix}`),
          apiClient.get(`/dashboards/${tipo}${suffix}`),
        ]);
        setResumen(resKpis.data);
        setDatos(resDash.data);
      } catch (err) {
        setError(extractErrorMessage(err));
      } finally {
        setCargando(false);
      }
    },
    [],
  );

  useEffect(() => {
    cargarDashboard(tab, false);
  }, [tab, cargarDashboard]);

  const kpis = resumen?.kpis;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableros Analíticos</h1>
          {datos?.ultimaActualizacion && (
            <p className="text-xs text-gray-500 mt-1">
              Actualizado el {new Date(datos.ultimaActualizacion).toLocaleString('es-CO')} ·{' '}
              {datos.desdeCache ? 'Servido desde caché (5 min)' : 'Cálculo en vivo'}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => cargarDashboard(tab, true)}
          className="silut-btn-secondary h-9 text-xs px-3.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
          Recalcular ahora
        </button>
      </div>

      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Estudiantes registrados"
            value={kpis.totalEstudiantes}
            helper={`${kpis.inscripcionesActivas} matrículas activas`}
            icon={<Users className="w-4 h-4" />}
          />
          <StatCard
            label="Programas y grupos"
            value={`${kpis.totalProgramas} / ${kpis.totalGrupos}`}
            helper={`${kpis.totalEducadores} educadores activos`}
            icon={<BookOpen className="w-4 h-4" />}
          />
          <StatCard
            label="Asistencia promedio"
            value={`${kpis.promedioAsistenciaGlobal}%`}
            helper="Consolidado institucional"
            icon={<CheckCircle2 className="w-4 h-4" />}
          />
          <StatCard
            label="Deserción / Alerta"
            value={kpis.estudiantesEnDesercionORiesgo}
            helper="Retiros o ≥ 3 faltas consecutivas"
            icon={<AlertTriangle className="w-4 h-4" />}
          />
        </div>
      )}

      {/* Pestañas limpias subrayadas */}
      <div role="tablist" aria-label="Tableros analíticos" className="flex flex-wrap gap-1 border-b border-gray-200">
        {[
          { id: 'matricula', label: 'Matrícula' },
          { id: 'geografico', label: 'Geográfico (Pereira)' },
          { id: 'asistencia', label: 'Asistencia' },
          { id: 'evaluaciones', label: 'Evaluaciones' },
          { id: 'programas', label: 'Programas' },
          { id: 'desercion', label: 'Deserción' },
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id as DashboardTab)}
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

      {error && (
        <div role="alert" className="rounded-lg bg-rose-50 border border-rose-200 text-rose-800 p-4 text-sm">
          {error}
        </div>
      )}

      {cargando || !datos ? (
        <div className="h-80 rounded-xl bg-white border border-gray-200 animate-pulse" />
      ) : (
        <>
          {tab === 'matricula' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 silut-card p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-5">
                  Estudiantes inscritos por programa formativo
                </h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datos.porPrograma} margin={{ left: 0, right: 16, bottom: 28 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis dataKey="programa" angle={-16} textAnchor="end" interval={0} fontSize={11} stroke="#9CA3AF" />
                      <YAxis allowDecimals={false} fontSize={11} stroke="#9CA3AF" />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="total" name="Inscritos" fill="#0F2440" radius={[6, 6, 0, 0]} maxBarSize={42} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="silut-card p-6">
                <h2 className="text-base font-semibold text-gray-900">Distribución por género</h2>
                <p className="text-xs text-gray-500 mt-1 mb-4">
                  Menores de edad (Ley 1581): <strong className="text-gray-800">{datos.menoresDeEdad}</strong>
                </p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={datos.porGenero}
                        dataKey="total"
                        nameKey="genero"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {(datos.porGenero || []).map((_: any, i: number) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {tab === 'geografico' && (
            <div className="space-y-5">
              <div className="silut-card p-6 space-y-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Distribución geográfica en Pereira y Área Metropolitana
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Selecciona cualquier marcador para ver el barrio, comuna y número de estudiantes.
                  </p>
                </div>
                <PereiraMap puntos={datos.porBarrio || []} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="silut-card p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">
                    Estudiantes por comuna / sector
                  </h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(datos.porComuna || []).slice(0, 10)} layout="vertical" margin={{ left: 32 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} fontSize={11} stroke="#9CA3AF" />
                        <YAxis dataKey="comuna" type="category" width={120} fontSize={11} stroke="#6B7280" />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Bar dataKey="total" name="Estudiantes" fill="#B0843B" radius={[0, 6, 6, 0]} maxBarSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="silut-card p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">
                    Ciudad de procedencia
                  </h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={datos.porCiudad || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                        <XAxis dataKey="ciudad" fontSize={11} stroke="#6B7280" />
                        <YAxis allowDecimals={false} fontSize={11} stroke="#9CA3AF" />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Bar dataKey="total" name="Estudiantes" fill="#0F2440" radius={[6, 6, 0, 0]} maxBarSize={38} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'asistencia' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="silut-card p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">
                  Evolución mensual de asistencia (%)
                </h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={datos.comparativaMensual || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis dataKey="mes" fontSize={11} stroke="#6B7280" />
                      <YAxis domain={[0, 100]} unit="%" fontSize={11} stroke="#9CA3AF" />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Line
                        type="monotone"
                        dataKey="porcentaje"
                        name="% Asistencia"
                        stroke="#0F2440"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#0F2440' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="silut-card p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">
                  Asistencia promedio por programa
                </h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datos.porPrograma || []} margin={{ bottom: 28 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis dataKey="programa" angle={-16} textAnchor="end" interval={0} fontSize={11} stroke="#6B7280" />
                      <YAxis domain={[0, 100]} unit="%" fontSize={11} stroke="#9CA3AF" />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="porcentaje" name="% Asistencia" fill="#2A7B6F" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {tab === 'evaluaciones' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="silut-card p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">
                  Conceptos cualitativos
                </h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={datos.distribucionNiveles || []}
                        dataKey="total"
                        nameKey="concepto"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={82}
                        paddingAngle={3}
                      >
                        {(datos.distribucionNiveles || []).map((_: any, i: number) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-2 silut-card p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">
                  Índice de avance cualitativo por programa (1.0 – 4.0)
                </h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datos.porPrograma || []} margin={{ bottom: 28 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis dataKey="programa" angle={-16} textAnchor="end" interval={0} fontSize={11} stroke="#6B7280" />
                      <YAxis domain={[0, 4]} fontSize={11} stroke="#9CA3AF" />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="indiceAvance" name="Índice cualitativo" fill="#B0843B" radius={[6, 6, 0, 0]} maxBarSize={42} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {tab === 'programas' && (
            <div className="silut-card overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">
                  Capacidad, ocupación, grupos activos y educadores
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs font-medium text-gray-500 bg-gray-50/80 border-b border-gray-200">
                    <tr>
                      <th scope="col" className="px-6 py-3">Programa</th>
                      <th scope="col" className="px-6 py-3">Grupos activos</th>
                      <th scope="col" className="px-6 py-3">Educadores</th>
                      <th scope="col" className="px-6 py-3">Estudiantes / Cupo</th>
                      <th scope="col" className="px-6 py-3">Ocupación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(datos.programas || []).map((p: any) => (
                      <tr key={p.programaId} className="hover:bg-gray-50/60">
                        <td className="px-6 py-3.5 font-medium text-gray-900">{p.programa}</td>
                        <td className="px-6 py-3.5 text-gray-600">{p.gruposActivos}</td>
                        <td className="px-6 py-3.5 text-gray-600">{p.educadoresAsignados}</td>
                        <td className="px-6 py-3.5 font-mono text-xs text-gray-700">
                          {p.estudiantesActivos} / {p.cupoTotal}
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-28 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand-navy rounded-full"
                                style={{ width: `${Math.min(100, p.porcentajeOcupacion)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-700">
                              {p.porcentajeOcupacion}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'desercion' && (
            <div className="space-y-5">
              <div className="silut-card px-5 py-4 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
                <span>
                  <strong className="text-gray-900">Criterio algorítmico:</strong>{' '}
                  {datos.criterioAlgoritmico}
                </span>
                <span>
                  Periodo 2026-2: <strong className="text-gray-900">{datos.totalDesercionActual}</strong> ({datos.tasaGlobalPct}%) ·
                  Periodo 2026-1: <strong className="text-gray-900">{datos.totalDesercionAnterior}</strong>
                </span>
              </div>

              <div className="silut-card p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">
                  Comparativa de deserción por programa (2026-2 vs 2026-1)
                </h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datos.porPrograma || []} margin={{ bottom: 28 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis dataKey="programa" angle={-16} textAnchor="end" interval={0} fontSize={11} stroke="#6B7280" />
                      <YAxis allowDecimals={false} fontSize={11} stroke="#9CA3AF" />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="totalDesercionActual" name="2026-2 (Actual)" fill="#0F2440" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="desercionPeriodoAnterior" name="2026-1 (Anterior)" fill="#B0843B" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="silut-card overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-base font-semibold text-gray-900">
                    Detalle de alertas y retiros ({(datos.casosDetalle || []).length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs font-medium text-gray-500 bg-gray-50/80 border-b border-gray-200">
                      <tr>
                        <th scope="col" className="px-6 py-3">Estudiante</th>
                        <th scope="col" className="px-6 py-3">Programa</th>
                        <th scope="col" className="px-6 py-3">Grupo</th>
                        <th scope="col" className="px-6 py-3">Motivo / Alerta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(datos.casosDetalle || []).map((c: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50/60">
                          <td className="px-6 py-3.5 font-medium text-gray-900">
                            {c.estudiante}{' '}
                            <span className="text-xs text-gray-400 font-mono">({c.documento})</span>
                          </td>
                          <td className="px-6 py-3.5 text-gray-700">{c.programa}</td>
                          <td className="px-6 py-3.5 text-xs text-gray-500">{c.grupo}</td>
                          <td className="px-6 py-3.5">
                            <span className="px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20 text-xs font-medium">
                              {c.causa}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
