import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  MapPin,
  Search,
  User,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { ProgramaPublico } from '../types';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/ui/Modal';

type Categoria = 'Todas' | 'Música' | 'Escénicas' | 'Artes Visuales';

function categoriaPrograma(nombre: string): Exclude<Categoria, 'Todas'> {
  const n = nombre.toLowerCase();
  if (n.includes('danza') || n.includes('teatro')) return 'Escénicas';
  if (n.includes('visual') || n.includes('plástic') || n.includes('foto')) return 'Artes Visuales';
  return 'Música';
}

export const LandingPage: React.FC = () => {
  const { usuario } = useAuth();
  const [programas, setProgramas] = useState<ProgramaPublico[]>([]);
  const [categoria, setCategoria] = useState<Categoria>('Todas');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionado, setSeleccionado] = useState<ProgramaPublico | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    apiClient
      .get<ProgramaPublico[]>('/programas')
      .then((res) => setProgramas(res.data))
      .catch(() => setProgramas([]))
      .finally(() => setCargando(false));
  }, []);

  const destinoPanel = () => {
    if (!usuario) return '/login';
    if (usuario.roles.includes('ADMINISTRADOR')) return '/admin';
    if (usuario.roles.includes('ADMINISTRATIVO')) return '/dashboards';
    if (usuario.roles.includes('EDUCADOR')) return '/educador';
    return '/estudiante';
  };

  const resumen = useMemo(() => {
    const gruposActivos = programas.flatMap((p) => p.grupos.filter((g) => g.activo));
    const cuposTotales = gruposActivos.reduce((s, g) => s + g.cupoMax, 0);
    const cuposDisponibles = gruposActivos.reduce((s, g) => s + g.cuposDisponibles, 0);
    return {
      totalProgramas: programas.length,
      totalGrupos: gruposActivos.length,
      cuposDisponibles,
      cuposTotales,
    };
  }, [programas]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return programas.filter((p) => {
      const catOk = categoria === 'Todas' || categoriaPrograma(p.nombre) === categoria;
      const qOk =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.descripcion.toLowerCase().includes(q) ||
        p.grupos.some((g) => g.nombre.toLowerCase().includes(q));
      return catOk && qOk;
    });
  }, [programas, categoria, busqueda]);

  return (
    <div className="space-y-8">
      {/* Cabecera institucional blanca y aireada */}
      <section className="silut-card p-7 sm:p-10">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-brand-navy bg-brand-navy-soft px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            Inscripciones abiertas · Periodo 2026-2 · Pereira
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-[1.15]">
            Escuela de Formación Cultural del Centro Cultural Lucy Tejada
          </h1>

          <p className="text-[15px] text-gray-600 leading-relaxed max-w-2xl">
            Inscríbete gratuitamente en las siete líneas artísticas de Pereira, consulta horarios,
            salones y tu avance formativo cualitativo desde una sola plataforma.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {usuario ? (
              <Link to={destinoPanel()} className="silut-btn-primary h-11 px-5">
                Ir a mi panel
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link to="/registro" className="silut-btn-primary h-11 px-5">
                  Inscribirme ahora
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/login" className="silut-btn-secondary h-11 px-5">
                  Iniciar sesión
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Franja limpia de métricas institucionales */}
        <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-500">Programas activos</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums">
              {resumen.totalProgramas}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Grupos abiertos</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums">
              {resumen.totalGrupos}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Cupos disponibles</p>
            <p className="mt-1 text-2xl font-semibold text-brand-navy tabular-nums">
              {resumen.cuposDisponibles}
              <span className="text-sm font-normal text-gray-400"> / {resumen.cuposTotales}</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Acceso ciudadano</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">Gratuito</p>
          </div>
        </div>
      </section>

      {/* Explorador interactivo de programas */}
      <section aria-labelledby="titulo-catalogo" className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 id="titulo-catalogo" className="text-xl font-semibold text-gray-900">
              Oferta Formativa
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Explora los programas y consulta grupos, horarios y cupos en tiempo real.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Filtro por disciplina */}
            <div className="inline-flex bg-white p-1 rounded-lg border border-gray-200/90 shadow-soft">
              {(['Todas', 'Música', 'Escénicas', 'Artes Visuales'] as Categoria[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoria(cat)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    categoria === cat
                      ? 'bg-brand-navy text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Buscador */}
            <div className="relative sm:w-56">
              <label htmlFor="buscar-prog" className="sr-only">
                Buscar programa
              </label>
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                id="buscar-prog"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar programa..."
                className="silut-input pl-9"
              />
            </div>
          </div>
        </div>

        {cargando ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-60 rounded-xl bg-white border border-gray-200 animate-pulse" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="silut-card p-10 text-center text-sm text-gray-500">
            No encontramos programas que coincidan con tu búsqueda.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtrados.map((prog) => {
              const gruposActivos = prog.grupos.filter((g) => g.activo);
              const cupoMax = gruposActivos.reduce((s, g) => s + g.cupoMax, 0);
              const inscritos = gruposActivos.reduce((s, g) => s + g.inscritos, 0);
              const disponibles = Math.max(0, cupoMax - inscritos);
              const pct = cupoMax > 0 ? Math.min(100, Math.round((inscritos / cupoMax) * 100)) : 0;
              const cat = categoriaPrograma(prog.nombre);

              return (
                <article
                  key={prog.id}
                  className="group bg-white rounded-xl border border-gray-200/90 shadow-card hover:shadow-card-hover hover:border-gray-300 transition-all p-6 flex flex-col justify-between"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-gold">
                        {cat}
                      </span>
                      <span className="text-xs text-gray-500">Desde {prog.edadMinima} años</span>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-brand-navy transition-colors">
                        {prog.nombre}
                      </h3>
                      <p className="mt-1.5 text-sm text-gray-600 leading-relaxed line-clamp-2">
                        {prog.descripcion}
                      </p>
                    </div>

                    {/* Barra limpia de disponibilidad */}
                    <div className="pt-1 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-700">
                          {disponibles > 0 ? `${disponibles} cupos disponibles` : 'Cupos agotados'}
                        </span>
                        <span className="text-gray-400 tabular-nums">
                          {gruposActivos.length} {gruposActivos.length === 1 ? 'grupo' : 'grupos'}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-navy rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setSeleccionado(prog)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-navy hover:text-brand-gold transition-colors"
                    >
                      Ver grupos y horarios
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <Link
                      to={usuario?.roles.includes('ESTUDIANTE') ? '/estudiante' : '/registro'}
                      className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      Inscribirme
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal limpio con el detalle de grupos, salones, formadores e indicadores */}
      <Modal
        open={!!seleccionado}
        onClose={() => setSeleccionado(null)}
        title={seleccionado ? `${seleccionado.nombre} · Grupos y Horarios` : ''}
        maxWidthClass="max-w-2xl"
      >
        {seleccionado && (
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm text-gray-600 leading-relaxed">{seleccionado.descripcion}</p>
              <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200/80 rounded-lg px-3.5 py-2.5">
                <strong className="text-gray-900">Requisitos:</strong> {seleccionado.requisitos} (Edad
                mínima: {seleccionado.edadMinima} años)
              </p>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Grupos abiertos (2026-2)
              </h3>
              {seleccionado.grupos
                .filter((g) => g.activo)
                .map((g) => (
                  <div
                    key={g.id}
                    className="rounded-xl border border-gray-200 p-4 bg-white space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">{g.nombre}</p>
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-brand-navy-soft text-brand-navy tabular-nums">
                        {g.cuposDisponibles} libres ({g.inscritos}/{g.cupoMax})
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        {g.educador?.nombreCompleto || 'Por asignar'}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {g.salon?.nombre || 'Por confirmar'}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {g.horarios
                          .map((h) => `${h.diaSemana} ${h.horaInicio}-${h.horaFin}`)
                          .join(' · ')}
                      </span>
                    </div>
                  </div>
                ))}
            </div>

            {seleccionado.indicadores.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Indicadores de Evaluación Cualitativa
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {seleccionado.indicadores.map((ind) => (
                    <div
                      key={ind.id}
                      className="text-xs rounded-lg bg-gray-50 border border-gray-100 p-3"
                    >
                      <p className="font-semibold text-gray-900">{ind.nombre}</p>
                      <p className="text-gray-500 mt-0.5">{ind.descripcion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSeleccionado(null)}
                className="silut-btn-secondary h-9 text-xs"
              >
                Cerrar
              </button>
              <Link
                to={usuario?.roles.includes('ESTUDIANTE') ? '/estudiante' : '/registro'}
                onClick={() => setSeleccionado(null)}
                className="silut-btn-primary h-9 text-xs"
              >
                Inscribirme en este programa
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
