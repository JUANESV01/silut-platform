import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  Asistencia,
  Educador,
  Estudiante,
  Evaluacion,
  Grupo,
  Inscripcion,
  Programa,
  Sesion,
} from '../database/entities';
import {
  ConceptoEvaluacion,
  EstadoAsistencia,
  EstadoInscripcion,
} from '../common/enums';
import { CacheService } from '../common/cache/cache.service';
import { contarInasistenciasConsecutivas } from '../asistencia/asistencia.service';

const DASHBOARD_TTL_SECONDS = 300; // 5 minutos (Entrega 2, Sec. 5.2.2 y TR-1)

const SCORE_CONCEPTO: Record<ConceptoEvaluacion, number> = {
  [ConceptoEvaluacion.INICIAL]: 1,
  [ConceptoEvaluacion.EN_PROCESO]: 2,
  [ConceptoEvaluacion.DESTACADO]: 3,
  [ConceptoEvaluacion.SOBRESALIENTE]: 4,
};

/**
 * Servicio de los Seis Dashboards Interactivos (ADM-05)
 * con patrón Proxy de Caché (cache-aside) e invalidación por evento.
 */
@Injectable()
export class DashboardsService {
  constructor(
    @InjectRepository(Estudiante)
    private readonly estudianteRepo: Repository<Estudiante>,
    @InjectRepository(Programa)
    private readonly programaRepo: Repository<Programa>,
    @InjectRepository(Grupo)
    private readonly grupoRepo: Repository<Grupo>,
    @InjectRepository(Educador)
    private readonly educadorRepo: Repository<Educador>,
    @InjectRepository(Inscripcion)
    private readonly inscripcionRepo: Repository<Inscripcion>,
    @InjectRepository(Sesion)
    private readonly sesionRepo: Repository<Sesion>,
    @InjectRepository(Asistencia)
    private readonly asistenciaRepo: Repository<Asistencia>,
    @InjectRepository(Evaluacion)
    private readonly evaluacionRepo: Repository<Evaluacion>,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  async obtenerDashboard(tipo: string, forceRefresh = false) {
    const tiposValidos = [
      'resumen',
      'matricula',
      'geografico',
      'asistencia',
      'evaluaciones',
      'programas',
      'desercion',
    ];

    const keyNorm = tipo.toLowerCase();
    if (!tiposValidos.includes(keyNorm)) {
      throw new BadRequestException(
        `Tipo de dashboard inválido: ${tipo}. Válidos: ${tiposValidos.join(', ')}`,
      );
    }

    const cacheKey = `dashboard:${keyNorm}`;
    if (!forceRefresh) {
      const cached = await this.cacheService.get<any>(cacheKey);
      if (cached) {
        return { ...cached, desdeCache: true };
      }
    }

    let data: any;
    switch (keyNorm) {
      case 'resumen':
        data = await this.construirResumenGeneral();
        break;
      case 'matricula':
        data = await this.construirDashboardMatricula();
        break;
      case 'geografico':
        data = await this.construirDashboardGeografico();
        break;
      case 'asistencia':
        data = await this.construirDashboardAsistencia();
        break;
      case 'evaluaciones':
        data = await this.construirDashboardEvaluaciones();
        break;
      case 'programas':
        data = await this.construirDashboardProgramas();
        break;
      case 'desercion':
        data = await this.construirDashboardDesercion();
        break;
    }

    const payload = {
      tipo: keyNorm,
      ultimaActualizacion: new Date().toISOString(),
      desdeCache: false,
      ...data,
    };

    await this.cacheService.set(cacheKey, payload, DASHBOARD_TTL_SECONDS);
    return payload;
  }

  private async construirResumenGeneral() {
    const [
      totalEstudiantes,
      totalEducadores,
      totalProgramas,
      totalGrupos,
      inscripcionesActivas,
      asistencia,
      desercion,
    ] = await Promise.all([
      this.estudianteRepo.count(),
      this.educadorRepo.count({ where: { activo: true } }),
      this.programaRepo.count({ where: { activo: true } }),
      this.grupoRepo.count({ where: { activo: true } }),
      this.inscripcionRepo.count({ where: { estado: EstadoInscripcion.ACTIVA } }),
      this.construirDashboardAsistencia(),
      this.construirDashboardDesercion(),
    ]);

    return {
      kpis: {
        totalEstudiantes,
        inscripcionesActivas,
        totalEducadores,
        totalProgramas,
        totalGrupos,
        promedioAsistenciaGlobal: asistencia.promedioGlobal,
        estudiantesEnDesercionORiesgo: desercion.totalDesercionActual,
      },
    };
  }

  /**
   * 1. Dashboard de Matrícula: inscritos por programa, grupo y género.
   */
  private async construirDashboardMatricula() {
    const inscripciones = await this.inscripcionRepo.find({
      relations: ['estudiante', 'grupo', 'grupo.programa'],
    });

    const activas = inscripciones.filter(
      (i) => i.estado === EstadoInscripcion.ACTIVA,
    );

    const porProgramaMap = new Map<string, number>();
    const porGrupoMap = new Map<
      string,
      { grupo: string; programa: string; inscritos: number; cupoMax: number }
    >();
    const porGeneroMap = new Map<string, number>();
    let menoresEdad = 0;

    for (const i of activas) {
      const prog = i.grupo?.programa?.nombre || 'Sin programa';
      porProgramaMap.set(prog, (porProgramaMap.get(prog) || 0) + 1);

      const gKey = i.grupoId;
      const gCur = porGrupoMap.get(gKey) || {
        grupo: i.grupo?.nombre || 'Grupo',
        programa: prog,
        inscritos: 0,
        cupoMax: i.grupo?.cupoMax || 0,
      };
      gCur.inscritos += 1;
      porGrupoMap.set(gKey, gCur);

      const gen = i.estudiante?.genero || 'No especificado';
      porGeneroMap.set(gen, (porGeneroMap.get(gen) || 0) + 1);
      if (i.estudiante?.esMenor) menoresEdad += 1;
    }

    return {
      totalActivas: activas.length,
      totalHistorico: inscripciones.length,
      menoresDeEdad: menoresEdad,
      porPrograma: Array.from(porProgramaMap.entries()).map(([programa, total]) => ({
        programa,
        total,
      })),
      porGrupo: Array.from(porGrupoMap.values()),
      porGenero: Array.from(porGeneroMap.entries()).map(([genero, total]) => ({
        genero,
        total,
      })),
    };
  }

  /**
   * 2. Dashboard Geográfico: distribución por barrio, comuna y ciudad con lat/lng para mapa interactivo.
   */
  private async construirDashboardGeografico() {
    const estudiantes = await this.estudianteRepo.find();
    const porBarrioMap = new Map<
      string,
      { barrio: string; comuna: string; total: number; lat: number; lng: number }
    >();
    const porComunaMap = new Map<string, number>();
    const porCiudadMap = new Map<string, number>();

    for (const e of estudiantes) {
      const barrio = e.barrio || 'Sin especificar';
      const comuna = e.comuna || 'Sin especificar';
      const ciudad = e.ciudadOrigen || 'Pereira';

      const cur = porBarrioMap.get(barrio) || {
        barrio,
        comuna,
        total: 0,
        lat: Number(e.latitud) || 4.8143,
        lng: Number(e.longitud) || -75.6946,
      };
      cur.total += 1;
      porBarrioMap.set(barrio, cur);

      porComunaMap.set(comuna, (porComunaMap.get(comuna) || 0) + 1);
      porCiudadMap.set(ciudad, (porCiudadMap.get(ciudad) || 0) + 1);
    }

    return {
      totalEstudiantes: estudiantes.length,
      porBarrio: Array.from(porBarrioMap.values()).sort((a, b) => b.total - a.total),
      porComuna: Array.from(porComunaMap.entries())
        .map(([comuna, total]) => ({ comuna, total }))
        .sort((a, b) => b.total - a.total),
      porCiudad: Array.from(porCiudadMap.entries())
        .map(([ciudad, total]) => ({ ciudad, total }))
        .sort((a, b) => b.total - a.total),
    };
  }

  /**
   * 3. Dashboard de Asistencia: porcentaje por grupo, programa, educador y comparativas mensuales.
   */
  private async construirDashboardAsistencia() {
    const registros = await this.asistenciaRepo.find({
      relations: [
        'sesion',
        'inscripcion',
        'inscripcion.grupo',
        'inscripcion.grupo.programa',
        'inscripcion.grupo.educador',
      ],
    });

    const calcPct = (p: number, e: number, t: number) =>
      t > 0 ? Math.round(((p + e * 0.5) / t) * 100) : 0;

    type Acc = { presentes: number; excusados: number; ausentes: number; total: number };
    const add = (map: Map<string, Acc>, key: string, est: EstadoAsistencia) => {
      const a = map.get(key) || { presentes: 0, excusados: 0, ausentes: 0, total: 0 };
      a.total++;
      if (est === EstadoAsistencia.PRESENTE) a.presentes++;
      else if (est === EstadoAsistencia.EXCUSADO) a.excusados++;
      else a.ausentes++;
      map.set(key, a);
    };

    const porPrograma = new Map<string, Acc>();
    const porGrupo = new Map<string, Acc>();
    const porEducador = new Map<string, Acc>();
    const porMes = new Map<string, Acc>();

    let pGlobal = 0;
    let eGlobal = 0;

    for (const r of registros) {
      if (r.estado === EstadoAsistencia.PRESENTE) pGlobal++;
      if (r.estado === EstadoAsistencia.EXCUSADO) eGlobal++;

      const prog = r.inscripcion?.grupo?.programa?.nombre || 'Sin programa';
      const grp = r.inscripcion?.grupo?.nombre || 'Sin grupo';
      const edu = r.inscripcion?.grupo?.educador
        ? `${r.inscripcion.grupo.educador.nombres} ${r.inscripcion.grupo.educador.apellidos}`
        : 'Sin educador';
      const mes = (r.sesion?.fecha || '').slice(0, 7) || 'Sin fecha';

      add(porPrograma, prog, r.estado);
      add(porGrupo, grp, r.estado);
      add(porEducador, edu, r.estado);
      add(porMes, mes, r.estado);
    }

    return {
      totalRegistros: registros.length,
      promedioGlobal: calcPct(pGlobal, eGlobal, registros.length),
      porPrograma: Array.from(porPrograma.entries()).map(([programa, a]) => ({
        programa,
        porcentaje: calcPct(a.presentes, a.excusados, a.total),
        ...a,
      })),
      porGrupo: Array.from(porGrupo.entries()).map(([grupo, a]) => ({
        grupo,
        porcentaje: calcPct(a.presentes, a.excusados, a.total),
        ...a,
      })),
      porEducador: Array.from(porEducador.entries()).map(([educador, a]) => ({
        educador,
        porcentaje: calcPct(a.presentes, a.excusados, a.total),
        ...a,
      })),
      comparativaMensual: Array.from(porMes.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mes, a]) => ({
          mes,
          porcentaje: calcPct(a.presentes, a.excusados, a.total),
          ...a,
        })),
    };
  }

  /**
   * 4. Dashboard de Evaluaciones: desempeño cualitativo por programa, grupo y distribución de niveles.
   */
  private async construirDashboardEvaluaciones() {
    const evaluaciones = await this.evaluacionRepo.find({
      relations: [
        'indicador',
        'inscripcion',
        'inscripcion.grupo',
        'inscripcion.grupo.programa',
      ],
    });

    const distribucion = {
      [ConceptoEvaluacion.INICIAL]: 0,
      [ConceptoEvaluacion.EN_PROCESO]: 0,
      [ConceptoEvaluacion.DESTACADO]: 0,
      [ConceptoEvaluacion.SOBRESALIENTE]: 0,
    };

    const porPrograma = new Map<string, { suma: number; total: number }>();
    const porGrupo = new Map<string, { suma: number; total: number }>();

    for (const ev of evaluaciones) {
      if (distribucion[ev.concepto] !== undefined) {
        distribucion[ev.concepto]++;
      }
      const score = SCORE_CONCEPTO[ev.concepto] || 2;
      const prog = ev.inscripcion?.grupo?.programa?.nombre || 'Sin programa';
      const grp = ev.inscripcion?.grupo?.nombre || 'Sin grupo';

      const pAcc = porPrograma.get(prog) || { suma: 0, total: 0 };
      pAcc.suma += score;
      pAcc.total += 1;
      porPrograma.set(prog, pAcc);

      const gAcc = porGrupo.get(grp) || { suma: 0, total: 0 };
      gAcc.suma += score;
      gAcc.total += 1;
      porGrupo.set(grp, gAcc);
    }

    const scoreToLabel = (avg: number) => {
      if (avg >= 3.5) return 'Sobresaliente';
      if (avg >= 2.6) return 'Destacado';
      if (avg >= 1.7) return 'En Proceso';
      return 'Inicial';
    };

    return {
      totalEvaluaciones: evaluaciones.length,
      distribucionNiveles: Object.entries(distribucion).map(([concepto, total]) => ({
        concepto,
        total,
      })),
      porPrograma: Array.from(porPrograma.entries()).map(([programa, v]) => {
        const indice = Number((v.suma / v.total).toFixed(2));
        return {
          programa,
          indiceAvance: indice,
          nivelPredominante: scoreToLabel(indice),
          totalEvaluaciones: v.total,
        };
      }),
      porGrupo: Array.from(porGrupo.entries()).map(([grupo, v]) => {
        const indice = Number((v.suma / v.total).toFixed(2));
        return {
          grupo,
          indiceAvance: indice,
          nivelPredominante: scoreToLabel(indice),
          totalEvaluaciones: v.total,
        };
      }),
    };
  }

  /**
   * 5. Dashboard de Programas: estudiantes, educadores asignados, grupos activos y ocupación.
   */
  private async construirDashboardProgramas() {
    const programas = await this.programaRepo.find({
      relations: ['grupos', 'grupos.inscripciones', 'grupos.educador'],
      order: { nombre: 'ASC' },
    });

    const resumen = programas.map((p) => {
      const gruposActivos = (p.grupos || []).filter((g) => g.activo);
      const educadoresSet = new Set(gruposActivos.map((g) => g.educadorId));
      const cupoTotal = gruposActivos.reduce((acc, g) => acc + g.cupoMax, 0);
      const estudiantesActivos = gruposActivos.reduce(
        (acc, g) =>
          acc +
          (g.inscripciones || []).filter(
            (i) => i.estado === EstadoInscripcion.ACTIVA,
          ).length,
        0,
      );
      const porcentajeOcupacion =
        cupoTotal > 0 ? Math.round((estudiantesActivos / cupoTotal) * 100) : 0;

      return {
        programaId: p.id,
        programa: p.nombre,
        gruposActivos: gruposActivos.length,
        educadoresAsignados: educadoresSet.size,
        estudiantesActivos,
        cupoTotal,
        porcentajeOcupacion,
      };
    });

    return {
      totalProgramas: resumen.length,
      programas: resumen,
    };
  }

  /**
   * 6. Dashboard de Deserción: retiros explícitos + estudiantes que alcanzan umbral
   * de inasistencias consecutivas (>=3), comparado con periodo anterior y entre programas.
   */
  private async construirDashboardDesercion() {
    const umbral = Number(
      this.configService.get<string>('DESERTION_ABSENCE_THRESHOLD') || 3,
    );

    const inscripciones = await this.inscripcionRepo.find({
      relations: [
        'estudiante',
        'grupo',
        'grupo.programa',
        'asistencias',
        'asistencias.sesion',
      ],
    });

    const porPrograma = new Map<
      string,
      {
        programa: string;
        totalInscritos: number;
        retirados: number;
        riesgoInasistencia: number;
        totalDesercionActual: number;
        desercionPeriodoAnterior: number;
      }
    >();

    const casosDetalle: Array<{
      estudiante: string;
      documento: string;
      programa: string;
      grupo: string;
      causa: string;
      inasistenciasConsecutivas: number;
    }> = [];

    for (const i of inscripciones) {
      const prog = i.grupo?.programa?.nombre || 'Sin programa';
      const acc = porPrograma.get(prog) || {
        programa: prog,
        totalInscritos: 0,
        retirados: 0,
        riesgoInasistencia: 0,
        totalDesercionActual: 0,
        desercionPeriodoAnterior: 0,
      };

      const esPeriodoAnterior = i.grupo?.periodo === '2026-1';
      if (esPeriodoAnterior) {
        if (
          i.estado === EstadoInscripcion.RETIRADA ||
          i.estado === EstadoInscripcion.CANCELADA
        ) {
          acc.desercionPeriodoAnterior++;
        }
        porPrograma.set(prog, acc);
        continue;
      }

      acc.totalInscritos++;

      const asistenciasDesc = [...(i.asistencias || [])].sort((a, b) =>
        (b.sesion?.fecha || '').localeCompare(a.sesion?.fecha || ''),
      );
      const consec = contarInasistenciasConsecutivas(
        asistenciasDesc.map((a) => a.estado),
      );

      if (
        i.estado === EstadoInscripcion.RETIRADA ||
        i.estado === EstadoInscripcion.CANCELADA
      ) {
        acc.retirados++;
        acc.totalDesercionActual++;
        casosDetalle.push({
          estudiante: `${i.estudiante.nombres} ${i.estudiante.apellidos}`,
          documento: i.estudiante.documento,
          programa: prog,
          grupo: i.grupo.nombre,
          causa: i.motivo || 'Retiro registrado',
          inasistenciasConsecutivas: consec,
        });
      } else if (consec >= umbral) {
        acc.riesgoInasistencia++;
        acc.totalDesercionActual++;
        casosDetalle.push({
          estudiante: `${i.estudiante.nombres} ${i.estudiante.apellidos}`,
          documento: i.estudiante.documento,
          programa: prog,
          grupo: i.grupo.nombre,
          causa: `Inasistencia reiterada (${consec} sesiones seguidas)`,
          inasistenciasConsecutivas: consec,
        });
      }

      porPrograma.set(prog, acc);
    }

    const programasArr = Array.from(porPrograma.values()).map((p) => ({
      ...p,
      tasaDesercionPct:
        p.totalInscritos > 0
          ? Math.round((p.totalDesercionActual / p.totalInscritos) * 100)
          : 0,
    }));

    const totalDesercionActual = programasArr.reduce(
      (s, p) => s + p.totalDesercionActual,
      0,
    );
    const totalDesercionAnterior = programasArr.reduce(
      (s, p) => s + p.desercionPeriodoAnterior,
      0,
    );
    const totalInscritosActual = programasArr.reduce(
      (s, p) => s + p.totalInscritos,
      0,
    );

    return {
      criterioAlgoritmico: `Retiro registrado o ≥ ${umbral} inasistencias consecutivas`,
      umbralInasistencias: umbral,
      totalDesercionActual,
      totalDesercionAnterior,
      tasaGlobalPct:
        totalInscritosActual > 0
          ? Math.round((totalDesercionActual / totalInscritosActual) * 100)
          : 0,
      porPrograma: programasArr,
      casosDetalle,
    };
  }
}
