import {
  Injectable,
  NotFoundException,
  GoneException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FormatoExportacion } from '../common/enums';
import {
  FiltrosMatriculados,
  InscripcionesService,
} from '../inscripciones/inscripciones.service';
import {
  ColumnaReporte,
  ExportadorFactory,
  ResultadoExportacion,
} from './exportadores.strategy';

export interface ReporteJob {
  id: string;
  estado: 'PENDIENTE' | 'PROCESANDO' | 'COMPLETADO' | 'ERROR';
  formato: FormatoExportacion;
  nombreArchivo: string;
  totalRegistros: number;
  creadoEn: Date;
  expiraEn: Date;
  error?: string;
  resultado?: ResultadoExportacion;
}

const COLUMNAS_MATRICULADOS: ColumnaReporte[] = [
  { key: 'documento', header: 'Documento', width: 16 },
  { key: 'nombreCompleto', header: 'Estudiante', width: 28 },
  { key: 'genero', header: 'Género', width: 14 },
  { key: 'programa', header: 'Programa Formativo', width: 26 },
  { key: 'grupo', header: 'Grupo / Clase', width: 24 },
  { key: 'cohorte', header: 'Cohorte', width: 12 },
  { key: 'educador', header: 'Educador', width: 24 },
  { key: 'barrio', header: 'Barrio', width: 18 },
  { key: 'comuna', header: 'Comuna', width: 20 },
  { key: 'ciudadOrigen', header: 'Ciudad Origen', width: 18 },
  { key: 'direccion', header: 'Dirección', width: 24 },
  { key: 'estado', header: 'Estado', width: 14 },
];

/**
 * Patrón Facade (Entrega 2, Sec. 4.4.1 y 5.1).
 * Oculta el subsistema de filtros, consultas, cola asíncrona y estrategias de exportación.
 */
@Injectable()
export class ReportFacade {
  private readonly jobs = new Map<string, ReporteJob>();

  constructor(
    private readonly inscripcionesService: InscripcionesService,
    private readonly exportadorFactory: ExportadorFactory,
  ) {}

  async solicitarReporteAsincrono(
    formato: FormatoExportacion,
    filtros: FiltrosMatriculados,
  ) {
    const id = randomUUID();
    const now = new Date();
    const expiraEn = new Date(now.getTime() + 30 * 60 * 1000); // 30 min TTL
    const ext = formato.toLowerCase();

    const job: ReporteJob = {
      id,
      estado: 'PENDIENTE',
      formato,
      nombreArchivo: `silut-matriculados-lucytejada-${now.toISOString().slice(0, 10)}.${ext}`,
      totalRegistros: 0,
      creadoEn: now,
      expiraEn,
    };

    this.jobs.set(id, job);

    // Procesamiento en segundo plano para no bloquear la petición HTTP (ATAM R4 / AD-7)
    setImmediate(() => {
      this.ejecutarJob(id, filtros).catch(() => undefined);
    });

    return {
      id: job.id,
      estado: job.estado,
      formato: job.formato,
      nombreArchivo: job.nombreArchivo,
      mensaje: 'Reporte encolado para generación en segundo plano.',
    };
  }

  private async ejecutarJob(id: string, filtros: FiltrosMatriculados) {
    const job = this.jobs.get(id);
    if (!job) return;

    try {
      job.estado = 'PROCESANDO';
      const data = await this.inscripcionesService.listarMatriculados({
        ...filtros,
        page: 1,
        limit: 5000,
      });

      const estrategia = this.exportadorFactory.obtener(job.formato);
      const resultado = await estrategia.exportar(
        'Reporte Consolidado de Estudiantes Matriculados',
        COLUMNAS_MATRICULADOS,
        data.items,
      );

      job.totalRegistros = data.items.length;
      job.resultado = resultado;
      job.estado = 'COMPLETADO';
    } catch (err) {
      job.estado = 'ERROR';
      job.error = (err as Error).message;
    }
  }

  obtenerEstadoJob(id: string) {
    const job = this.jobs.get(id);
    if (!job) throw new NotFoundException('Trabajo de reporte no encontrado');
    if (Date.now() > job.expiraEn.getTime()) {
      this.jobs.delete(id);
      throw new GoneException('El archivo de reporte ha expirado');
    }
    return {
      id: job.id,
      estado: job.estado,
      formato: job.formato,
      nombreArchivo: job.nombreArchivo,
      totalRegistros: job.totalRegistros,
      creadoEn: job.creadoEn,
      error: job.error,
    };
  }

  obtenerArchivoJob(id: string): {
    nombreArchivo: string;
    resultado: ResultadoExportacion;
  } {
    const job = this.jobs.get(id);
    if (!job) throw new NotFoundException('Trabajo de reporte no encontrado');
    if (Date.now() > job.expiraEn.getTime()) {
      this.jobs.delete(id);
      throw new GoneException('El archivo de reporte ha expirado');
    }
    if (job.estado !== 'COMPLETADO' || !job.resultado) {
      throw new NotFoundException('El reporte aún se encuentra en procesamiento');
    }
    return { nombreArchivo: job.nombreArchivo, resultado: job.resultado };
  }

  async generarDirecto(
    formato: FormatoExportacion,
    filtros: FiltrosMatriculados,
  ): Promise<{ nombreArchivo: string; resultado: ResultadoExportacion }> {
    const data = await this.inscripcionesService.listarMatriculados({
      ...filtros,
      page: 1,
      limit: 5000,
    });
    const estrategia = this.exportadorFactory.obtener(formato);
    const resultado = await estrategia.exportar(
      'Reporte Consolidado de Estudiantes Matriculados',
      COLUMNAS_MATRICULADOS,
      data.items,
    );
    return {
      nombreArchivo: `silut-matriculados-lucytejada-${new Date().toISOString().slice(0, 10)}.${resultado.extension}`,
      resultado,
    };
  }
}
