import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Download, Plus } from 'lucide-react';
import { apiClient, extractErrorMessage } from '../api/client';
import { ProgramaPublico } from '../types';

type TabGestion = 'programas' | 'grupos' | 'salones' | 'migracion';

export const GestionAcademicaPage: React.FC = () => {
  const [tab, setTab] = useState<TabGestion>('programas');
  const [programas, setProgramas] = useState<ProgramaPublico[]>([]);
  const [salones, setSalones] = useState<any[]>([]);
  const [educadores, setEducadores] = useState<any[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const [progForm, setProgForm] = useState({
    nombre: '',
    descripcion: '',
    requisitos: '',
    edadMinima: 7,
    indicador1: 'Dominio Técnico',
    indicador2: 'Expresión y Creatividad',
  });

  const [salonForm, setSalonForm] = useState({ nombre: '', ubicacion: '', capacidad: 25 });

  const [grupoForm, setGrupoForm] = useState({
    programaId: '',
    educadorId: '',
    salonId: '',
    nombre: '',
    cupoMax: 24,
    periodo: '2026-2',
    diaSemana: 'Lunes',
    horaInicio: '14:00',
    horaFin: '16:00',
  });

  const [csvTexto, setCsvTexto] = useState('');
  const [resMigracion, setResMigracion] = useState<any>(null);

  const cargar = useCallback(async () => {
    try {
      const [pRes, sRes, eRes] = await Promise.all([
        apiClient.get<ProgramaPublico[]>('/programas'),
        apiClient.get('/programas/salones'),
        apiClient.get('/programas/educadores'),
      ]);
      setProgramas(pRes.data);
      setSalones(sRes.data);
      setEducadores(eRes.data);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const crearPrograma = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    try {
      await apiClient.post('/programas', {
        nombre: progForm.nombre,
        descripcion: progForm.descripcion,
        requisitos: progForm.requisitos,
        edadMinima: Number(progForm.edadMinima),
        indicadores: [
          { nombre: progForm.indicador1, descripcion: 'Indicador formativo 1', orden: 1 },
          { nombre: progForm.indicador2, descripcion: 'Indicador formativo 2', orden: 2 },
        ],
      });
      setMensaje(`Programa «${progForm.nombre}» creado y habilitado para matrícula.`);
      setProgForm({ nombre: '', descripcion: '', requisitos: '', edadMinima: 7, indicador1: 'Dominio Técnico', indicador2: 'Expresión y Creatividad' });
      await cargar();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const crearSalon = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    try {
      await apiClient.post('/programas/salones', {
        ...salonForm,
        capacidad: Number(salonForm.capacidad),
      });
      setMensaje(`Salón «${salonForm.nombre}» registrado.`);
      setSalonForm({ nombre: '', ubicacion: '', capacidad: 25 });
      await cargar();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const crearGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('');
    setError('');
    try {
      await apiClient.post('/grupos', {
        programaId: grupoForm.programaId,
        educadorId: grupoForm.educadorId,
        salonId: grupoForm.salonId,
        nombre: grupoForm.nombre,
        cupoMax: Number(grupoForm.cupoMax),
        periodo: grupoForm.periodo,
        horarios: [
          {
            diaSemana: grupoForm.diaSemana,
            horaInicio: grupoForm.horaInicio,
            horaFin: grupoForm.horaFin,
          },
        ],
      });
      setMensaje(`Grupo «${grupoForm.nombre}» creado correctamente.`);
      setGrupoForm((prev) => ({ ...prev, nombre: '' }));
      await cargar();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const descargarPlantilla = async () => {
    const res = await apiClient.get('/migracion/plantilla', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-migracion-alcaldia-pereira.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const ejecutarMigracion = async (soloValidar: boolean) => {
    setMensaje('');
    setError('');
    try {
      const { data } = await apiClient.post(
        `/migracion/importar?soloValidar=${soloValidar}`,
        { csv: csvTexto },
      );
      setResMigracion(data);
      if (!soloValidar) {
        setMensaje(
          `Migración completada: ${data.importados} estudiante(s) importados y ${data.inscripcionesCreadas} matrícula(s).`,
        );
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Programas, Grupos y Migración</h1>
        <p className="text-xs text-gray-500 mt-1">
          Administra la oferta formativa, salones, horarios e importación masiva desde la Alcaldía.
        </p>
      </div>

      <div role="tablist" className="flex flex-wrap gap-1 border-b border-gray-200">
        {[
          { id: 'programas', label: 'Programas e Indicadores' },
          { id: 'grupos', label: 'Grupos y Horarios' },
          { id: 'salones', label: 'Salones' },
          { id: 'migracion', label: 'Migración Alcaldía (CSV)' },
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id as TabGestion)}
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

      {tab === 'programas' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={crearPrograma} className="silut-card p-6 space-y-3.5 h-fit">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-brand-navy" /> Nuevo programa
            </h2>
            <div>
              <label className="silut-label">Nombre *</label>
              <input
                required
                placeholder="Ej. Fotografía Cultural"
                value={progForm.nombre}
                onChange={(e) => setProgForm({ ...progForm, nombre: e.target.value })}
                className="silut-input"
              />
            </div>
            <div>
              <label className="silut-label">Descripción</label>
              <textarea
                rows={2}
                value={progForm.descripcion}
                onChange={(e) => setProgForm({ ...progForm, descripcion: e.target.value })}
                className="silut-textarea"
              />
            </div>
            <div>
              <label className="silut-label">Requisitos</label>
              <input
                value={progForm.requisitos}
                onChange={(e) => setProgForm({ ...progForm, requisitos: e.target.value })}
                className="silut-input"
              />
            </div>
            <div>
              <label className="silut-label">Edad mínima</label>
              <input
                type="number"
                min={4}
                value={progForm.edadMinima}
                onChange={(e) => setProgForm({ ...progForm, edadMinima: Number(e.target.value) })}
                className="silut-input"
              />
            </div>
            <div>
              <label className="silut-label">Indicadores cualitativos iniciales</label>
              <div className="space-y-2">
                <input
                  value={progForm.indicador1}
                  onChange={(e) => setProgForm({ ...progForm, indicador1: e.target.value })}
                  className="silut-input"
                />
                <input
                  value={progForm.indicador2}
                  onChange={(e) => setProgForm({ ...progForm, indicador2: e.target.value })}
                  className="silut-input"
                />
              </div>
            </div>
            <button type="submit" className="silut-btn-primary w-full">
              Crear programa
            </button>
          </form>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {programas.map((p) => (
              <div key={p.id} className="silut-card p-5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">{p.nombre}</h3>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                    {p.grupos.length} grupo(s)
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{p.descripcion}</p>
                <div className="pt-2.5 border-t border-gray-100">
                  <p className="text-[11px] font-medium text-gray-400 mb-1">
                    Indicadores ({p.indicadores.length})
                  </p>
                  <ul className="text-xs text-gray-700 list-disc pl-4 space-y-0.5">
                    {p.indicadores.map((ind) => (
                      <li key={ind.id}>{ind.nombre}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'grupos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={crearGrupo} className="silut-card p-6 space-y-3.5 h-fit">
            <h2 className="text-base font-semibold text-gray-900">Crear grupo y horario</h2>
            <select
              required
              value={grupoForm.programaId}
              onChange={(e) => setGrupoForm({ ...grupoForm, programaId: e.target.value })}
              className="silut-select"
            >
              <option value="">Selecciona programa...</option>
              {programas.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
            <select
              required
              value={grupoForm.educadorId}
              onChange={(e) => setGrupoForm({ ...grupoForm, educadorId: e.target.value })}
              className="silut-select"
            >
              <option value="">Selecciona educador...</option>
              {educadores.map((e) => (
                <option key={e.id} value={e.id}>{e.nombreCompleto}</option>
              ))}
            </select>
            <select
              required
              value={grupoForm.salonId}
              onChange={(e) => setGrupoForm({ ...grupoForm, salonId: e.target.value })}
              className="silut-select"
            >
              <option value="">Selecciona salón...</option>
              {salones.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre} (Cap. {s.capacidad})</option>
              ))}
            </select>
            <input
              required
              placeholder="Nombre del grupo"
              value={grupoForm.nombre}
              onChange={(e) => setGrupoForm({ ...grupoForm, nombre: e.target.value })}
              className="silut-input"
            />
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="number"
                min={1}
                value={grupoForm.cupoMax}
                onChange={(e) => setGrupoForm({ ...grupoForm, cupoMax: Number(e.target.value) })}
                placeholder="Cupo máx"
                className="silut-input"
              />
              <input
                value={grupoForm.periodo}
                onChange={(e) => setGrupoForm({ ...grupoForm, periodo: e.target.value })}
                placeholder="Periodo"
                className="silut-input"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={grupoForm.diaSemana}
                onChange={(e) => setGrupoForm({ ...grupoForm, diaSemana: e.target.value })}
                className="silut-select text-xs px-2"
              >
                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <input
                type="time"
                value={grupoForm.horaInicio}
                onChange={(e) => setGrupoForm({ ...grupoForm, horaInicio: e.target.value })}
                className="silut-input text-xs px-2"
              />
              <input
                type="time"
                value={grupoForm.horaFin}
                onChange={(e) => setGrupoForm({ ...grupoForm, horaFin: e.target.value })}
                className="silut-input text-xs px-2"
              />
            </div>
            <button type="submit" className="silut-btn-primary w-full">
              Crear grupo
            </button>
          </form>

          <div className="lg:col-span-2 silut-card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Grupos configurados</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {programas.flatMap((p) =>
                p.grupos.map((g) => (
                  <div key={g.id} className="px-6 py-3.5 flex flex-wrap items-center justify-between gap-2 text-xs hover:bg-gray-50/60">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{g.nombre}</p>
                      <p className="text-gray-500 mt-0.5">
                        {p.nombre} · {g.educador?.nombreCompleto} · {g.salon?.nombre}
                      </p>
                      <p className="text-gray-400">
                        {g.horarios.map((h) => `${h.diaSemana} ${h.horaInicio}-${h.horaFin}`).join(' · ')}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-gray-100 font-mono text-gray-700">
                      {g.inscritos}/{g.cupoMax} · {g.periodo}
                    </span>
                  </div>
                )),
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'salones' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={crearSalon} className="silut-card p-6 space-y-3.5 h-fit">
            <h2 className="text-base font-semibold text-gray-900">Registrar salón</h2>
            <input
              required
              placeholder="Nombre del salón"
              value={salonForm.nombre}
              onChange={(e) => setSalonForm({ ...salonForm, nombre: e.target.value })}
              className="silut-input"
            />
            <input
              required
              placeholder="Ubicación física (Piso / Ala)"
              value={salonForm.ubicacion}
              onChange={(e) => setSalonForm({ ...salonForm, ubicacion: e.target.value })}
              className="silut-input"
            />
            <input
              type="number"
              min={1}
              required
              value={salonForm.capacidad}
              onChange={(e) => setSalonForm({ ...salonForm, capacidad: Number(e.target.value) })}
              className="silut-input"
            />
            <button type="submit" className="silut-btn-primary w-full">
              Guardar salón
            </button>
          </form>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {salones.map((s) => (
              <div key={s.id} className="silut-card p-5">
                <h3 className="text-sm font-semibold text-gray-900">{s.nombre}</h3>
                <p className="text-xs text-gray-500 mt-1">{s.ubicacion}</p>
                <p className="text-xs font-medium text-brand-navy mt-3">
                  Capacidad: {s.capacidad} personas
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'migracion' && (
        <div className="silut-card p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Migración por lotes desde la Alcaldía de Pereira
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Valida unicidad de documento, correos y datos de acudiente antes de importar.
              </p>
            </div>
            <button type="button" onClick={descargarPlantilla} className="silut-btn-secondary h-9 text-xs">
              <Download className="w-3.5 h-3.5" /> Descargar plantilla CSV
            </button>
          </div>

          <div className="space-y-2.5">
            <input
              id="mig-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) file.text().then((txt) => setCsvTexto(txt));
              }}
              className="block text-xs text-gray-600"
            />
            <textarea
              rows={6}
              value={csvTexto}
              onChange={(e) => setCsvTexto(e.target.value)}
              placeholder="Pega aquí el contenido CSV o selecciona un archivo..."
              className="silut-textarea font-mono text-xs"
            />
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled={!csvTexto.trim()}
              onClick={() => ejecutarMigracion(true)}
              className="silut-btn-secondary"
            >
              1. Validar lote (Dry-run)
            </button>
            <button
              type="button"
              disabled={!csvTexto.trim()}
              onClick={() => ejecutarMigracion(false)}
              className="silut-btn-primary"
            >
              2. Ejecutar importación
            </button>
          </div>

          {resMigracion && (
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                <span>Filas: <strong className="text-gray-900">{resMigracion.totalFilas}</strong></span>
                <span>Válidas: <strong className="text-emerald-700">{resMigracion.validos}</strong></span>
                <span>Rechazadas: <strong className="text-rose-700">{resMigracion.rechazados}</strong></span>
                <span>Rechazo: <strong className="text-gray-900">{resMigracion.tasaRechazoPct}%</strong></span>
                {resMigracion.alertaR05 && (
                  <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" /> Alerta R05: rechazo &gt; 2%
                  </span>
                )}
              </div>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="px-3.5 py-2.5">Fila</th>
                      <th className="px-3.5 py-2.5">Estudiante</th>
                      <th className="px-3.5 py-2.5">Documento</th>
                      <th className="px-3.5 py-2.5">Estado</th>
                      <th className="px-3.5 py-2.5">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(resMigracion.detalle || []).map((d: any) => (
                      <tr key={d.fila}>
                        <td className="px-3.5 py-2 font-mono">{d.fila}</td>
                        <td className="px-3.5 py-2">{d.nombreCompleto}</td>
                        <td className="px-3.5 py-2 font-mono">{d.documento}</td>
                        <td className="px-3.5 py-2">
                          <span className={`px-2 py-0.5 rounded font-medium ${d.valido ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            {d.valido ? 'Válido' : 'Rechazado'}
                          </span>
                        </td>
                        <td className="px-3.5 py-2 text-rose-700">{(d.errores || []).join(' · ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
