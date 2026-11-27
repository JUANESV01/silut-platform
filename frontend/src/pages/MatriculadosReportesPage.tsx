import React, { useEffect, useState, useCallback } from 'react';
import { Download, RotateCcw, Search } from 'lucide-react';
import { apiClient, extractErrorMessage } from '../api/client';
import { BarrioPereira, FormatoExportacion, ProgramaPublico } from '../types';

export const MatriculadosReportesPage: React.FC = () => {
  const [programas, setProgramas] = useState<ProgramaPublico[]>([]);
  const [barrios, setBarrios] = useState<BarrioPereira[]>([]);
  const [ciudades, setCiudades] = useState<string[]>([]);

  const [filtros, setFiltros] = useState({
    programaId: '',
    grupoId: '',
    barrio: '',
    ciudadOrigen: '',
    genero: '',
    estado: 'ACTIVA',
    busqueda: '',
    page: 1,
  });

  const [resultado, setResultado] = useState<any>({ items: [], total: 0, page: 1, totalPages: 1 });
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiClient.get<ProgramaPublico[]>('/programas'),
      apiClient.get('/estudiantes/catalogos/ubicacion'),
    ])
      .then(([pRes, cRes]) => {
        setProgramas(pRes.data);
        setBarrios(cRes.data.barrios || []);
        setCiudades(cRes.data.ciudades || []);
      })
      .catch(() => undefined);
  }, []);

  const consultar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const params: Record<string, any> = { page: filtros.page, limit: 20 };
      Object.entries(filtros).forEach(([k, v]) => {
        if (v && k !== 'page') params[k] = v;
      });
      const { data } = await apiClient.get('/matriculados', { params });
      setResultado(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => {
    consultar();
  }, [consultar]);

  const exportarAsincrono = async (formato: FormatoExportacion) => {
    setExportando(formato);
    setMensaje('');
    setError('');
    try {
      const payload: Record<string, any> = { formato };
      Object.entries(filtros).forEach(([k, v]) => {
        if (v && k !== 'page') payload[k] = v;
      });

      const { data: job } = await apiClient.post('/reportes', payload);

      let estado = job.estado;
      let intentos = 0;
      while ((estado === 'PENDIENTE' || estado === 'PROCESANDO') && intentos < 25) {
        await new Promise((r) => setTimeout(r, 300));
        const check = await apiClient.get(`/reportes/${job.id}`);
        estado = check.data.estado;
        if (estado === 'ERROR') {
          throw new Error(check.data.error || 'Error generando el archivo');
        }
        intentos++;
      }

      const fileRes = await apiClient.get(`/reportes/${job.id}/descargar`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([fileRes.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', job.nombreArchivo);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setMensaje(`Reporte ${formato} descargado (${job.nombreArchivo}).`);
    } catch (err) {
      setError(extractErrorMessage(err, `No se pudo exportar en formato ${formato}`));
    } finally {
      setExportando(null);
    }
  };

  const programaSel = programas.find((p) => p.id === filtros.programaId);
  const gruposFiltrables = programaSel
    ? programaSel.grupos
    : programas.flatMap((p) => p.grupos);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Directorio de Matriculados</h1>
          <p className="text-xs text-gray-500 mt-1">
            {resultado.total} registro(s) encontrados · Exportación asíncrona en Excel, PDF y CSV
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['XLSX', 'PDF', 'CSV'] as FormatoExportacion[]).map((fmt) => (
            <button
              key={fmt}
              type="button"
              disabled={exportando !== null}
              onClick={() => exportarAsincrono(fmt)}
              className="silut-btn-secondary h-9 text-xs px-3.5"
            >
              <Download className="w-3.5 h-3.5" />
              {exportando === fmt ? `Generando ${fmt}...` : `Exportar ${fmt}`}
            </button>
          ))}
        </div>
      </div>

      <section aria-label="Filtros de segmentación" className="silut-card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <label htmlFor="flt-q" className="sr-only">Buscar</label>
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              id="flt-q"
              value={filtros.busqueda}
              onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value, page: 1 })}
              placeholder="Nombre, documento o dirección..."
              className="silut-input pl-9"
            />
          </div>

          <select
            aria-label="Programa"
            value={filtros.programaId}
            onChange={(e) =>
              setFiltros({ ...filtros, programaId: e.target.value, grupoId: '', page: 1 })
            }
            className="silut-select"
          >
            <option value="">Todos los programas</option>
            {programas.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>

          <select
            aria-label="Grupo"
            value={filtros.grupoId}
            onChange={(e) => setFiltros({ ...filtros, grupoId: e.target.value, page: 1 })}
            className="silut-select"
          >
            <option value="">Todos los grupos</option>
            {gruposFiltrables.map((g) => (
              <option key={g.id} value={g.id}>{g.nombre}</option>
            ))}
          </select>

          <select
            aria-label="Barrio de Pereira"
            value={filtros.barrio}
            onChange={(e) => setFiltros({ ...filtros, barrio: e.target.value, page: 1 })}
            className="silut-select"
          >
            <option value="">Todos los barrios</option>
            {barrios.map((b) => (
              <option key={b.barrio} value={b.barrio}>{b.barrio} ({b.comuna})</option>
            ))}
          </select>

          <select
            aria-label="Ciudad de origen"
            value={filtros.ciudadOrigen}
            onChange={(e) => setFiltros({ ...filtros, ciudadOrigen: e.target.value, page: 1 })}
            className="silut-select"
          >
            <option value="">Todas las ciudades</option>
            {ciudades.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            aria-label="Género"
            value={filtros.genero}
            onChange={(e) => setFiltros({ ...filtros, genero: e.target.value, page: 1 })}
            className="silut-select"
          >
            <option value="">Todos los géneros</option>
            <option value="Femenino">Femenino</option>
            <option value="Masculino">Masculino</option>
            <option value="No binario">No binario</option>
          </select>

          <select
            aria-label="Estado"
            value={filtros.estado}
            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value, page: 1 })}
            className="silut-select"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVA">Activas</option>
            <option value="RETIRADA">Retiradas</option>
            <option value="CANCELADA">Canceladas</option>
            <option value="COMPLETADA">Completadas</option>
          </select>

          <button
            type="button"
            onClick={() =>
              setFiltros({
                programaId: '',
                grupoId: '',
                barrio: '',
                ciudadOrigen: '',
                genero: '',
                estado: 'ACTIVA',
                busqueda: '',
                page: 1,
              })
            }
            className="silut-btn-secondary"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Limpiar filtros
          </button>
        </div>
      </section>

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

      <div className="silut-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs font-medium text-gray-500 bg-gray-50/80 border-b border-gray-200">
              <tr>
                <th scope="col" className="px-5 py-3">Estudiante</th>
                <th scope="col" className="px-5 py-3">Documento</th>
                <th scope="col" className="px-5 py-3">Programa / Grupo</th>
                <th scope="col" className="px-5 py-3">Género</th>
                <th scope="col" className="px-5 py-3">Residencia</th>
                <th scope="col" className="px-5 py-3">Origen</th>
                <th scope="col" className="px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cargando ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-500">
                    Consultando directorio...
                  </td>
                </tr>
              ) : resultado.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-500">
                    No se encontraron registros con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                resultado.items.map((item: any) => (
                  <tr key={item.inscripcionId} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{item.nombreCompleto}</p>
                      <p className="text-xs text-gray-500">{item.correo}</p>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-600">
                      {item.tipoDocumento} {item.documento}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-xs text-brand-navy">{item.programa}</p>
                      <p className="text-xs text-gray-500">{item.grupo}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-600">{item.genero}</td>
                    <td className="px-5 py-3.5 text-xs">
                      <p className="font-medium text-gray-800">{item.barrio}</p>
                      <p className="text-gray-500">{item.direccion}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-600">{item.ciudadOrigen}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                          item.estado === 'ACTIVA'
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                            : 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20'
                        }`}
                      >
                        {item.estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {resultado.totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Página {resultado.page} de {resultado.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={filtros.page <= 1}
                onClick={() => setFiltros((f) => ({ ...f, page: f.page - 1 }))}
                className="silut-btn-secondary h-8 px-3 text-xs"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={filtros.page >= resultado.totalPages}
                onClick={() => setFiltros((f) => ({ ...f, page: f.page + 1 }))}
                className="silut-btn-secondary h-8 px-3 text-xs"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
