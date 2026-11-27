import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import {
  Asistencia,
  Educador,
  Grupo,
  Inscripcion,
  Sesion,
} from '../database/entities';
import {
  EstadoAsistencia,
  EstadoInscripcion,
  RequestUser,
  RoleName,
} from '../common/enums';
import { CacheService } from '../common/cache/cache.service';
import { CrearSesionDto, GuardarAsistenciaDto } from './asistencia.dto';

export function contarInasistenciasConsecutivas(
  estadosOrdenDesc: EstadoAsistencia[],
): number {
  let consecutivas = 0;
  for (const est of estadosOrdenDesc) {
    if (est === EstadoAsistencia.AUSENTE) {
      consecutivas++;
    } else {
      break;
    }
  }
  return consecutivas;
}

@Injectable()
export class AsistenciaService {
  constructor(
    @InjectRepository(Sesion)
    private readonly sesionRepo: Repository<Sesion>,
    @InjectRepository(Asistencia)
    private readonly asistenciaRepo: Repository<Asistencia>,
    @InjectRepository(Grupo)
    private readonly grupoRepo: Repository<Grupo>,
    @InjectRepository(Educador)
    private readonly educadorRepo: Repository<Educador>,
    @InjectRepository(Inscripcion)
    private readonly inscripcionRepo: Repository<Inscripcion>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  private async verificarAccesoGrupo(grupoId: string, user: RequestUser): Promise<Grupo> {
    const grupo = await this.grupoRepo.findOne({
      where: { id: grupoId },
      relations: ['programa', 'educador'],
    });
    if (!grupo) throw new NotFoundException('Grupo no encontrado');

    const esAdmin =
      user.roles.includes(RoleName.ADMINISTRADOR) ||
      user.roles.includes(RoleName.ADMINISTRATIVO);

    if (!esAdmin) {
      const educador = await this.educadorRepo.findOne({
        where: { usuarioId: user.id },
      });
      if (!educador || grupo.educadorId !== educador.id) {
        throw new ForbiddenException(
          'Solo el educador asignado a este grupo puede gestionar su asistencia.',
        );
      }
    }

    return grupo;
  }

  async crearOObtenerSesion(dto: CrearSesionDto, user: RequestUser) {
    await this.verificarAccesoGrupo(dto.grupoId, user);

    // Regla de dominio: no se permite registrar sesiones futuras
    const fechaClase = new Date(`${dto.fecha}T00:00:00`);
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);
    if (fechaClase.getTime() > hoy.getTime()) {
      throw new UnprocessableEntityException(
        'No se puede registrar asistencia para una fecha futura.',
      );
    }

    let sesion = await this.sesionRepo.findOne({
      where: { grupoId: dto.grupoId, fecha: dto.fecha },
      relations: ['asistencias'],
    });

    if (!sesion) {
      sesion = await this.sesionRepo.save(
        this.sesionRepo.create({
          grupoId: dto.grupoId,
          fecha: dto.fecha,
          tema: dto.tema || null,
          observaciones: dto.observaciones || null,
        }),
      );
      sesion.asistencias = [];
    } else if (dto.tema || dto.observaciones) {
      if (dto.tema) sesion.tema = dto.tema;
      if (dto.observaciones) sesion.observaciones = dto.observaciones;
      await this.sesionRepo.save(sesion);
    }

    return sesion;
  }

  async listarSesionesPorGrupo(grupoId: string, user: RequestUser) {
    await this.verificarAccesoGrupo(grupoId, user);
    return this.sesionRepo.find({
      where: { grupoId },
      relations: ['asistencias'],
      order: { fecha: 'DESC' },
    });
  }

  /**
   * Registro y modificación en lote de asistencia por sesión (EDU-03, Figura 9).
   * Guarda atómicamente, invalida caché de dashboards y dispara alertas si hay inasistencias reiteradas.
   */
  async registrarAsistencia(
    sesionId: string,
    dto: GuardarAsistenciaDto,
    user: RequestUser,
  ) {
    const sesion = await this.sesionRepo.findOne({
      where: { id: sesionId },
    });
    if (!sesion) throw new NotFoundException('Sesión no encontrada');

    const grupo = await this.verificarAccesoGrupo(sesion.grupoId, user);

    const guardados = await this.dataSource.transaction(async (manager) => {
      const results: Asistencia[] = [];
      for (const item of dto.registros) {
        const insc = await manager.findOne(Inscripcion, {
          where: { id: item.inscripcionId, grupoId: sesion.grupoId },
        });
        if (!insc) {
          throw new UnprocessableEntityException(
            `La inscripción ${item.inscripcionId} no pertenece a este grupo.`,
          );
        }

        let registro = await manager.findOne(Asistencia, {
          where: { sesionId: sesion.id, inscripcionId: item.inscripcionId },
        });

        if (registro) {
          registro.estado = item.estado;
          registro.observacion = item.observacion ?? registro.observacion;
        } else {
          registro = manager.create(Asistencia, {
            sesionId: sesion.id,
            inscripcionId: item.inscripcionId,
            estado: item.estado,
            observacion: item.observacion ?? null,
          });
        }
        results.push(await manager.save(Asistencia, registro));
      }
      return results;
    });

    // Invalidación inmediata de caché de dashboards (Figura 9 / TR-1)
    await this.cacheService.delByPrefix('dashboard:');

    // Detección de inasistencias consecutivas >= umbral (Deserción + EST-06)
    const umbral = Number(
      this.configService.get<string>('DESERTION_ABSENCE_THRESHOLD') || 3,
    );
    const alertasDesercion: Array<{
      usuarioId: string;
      correo: string;
      estudianteNombre: string;
      inasistenciasConsecutivas: number;
    }> = [];

    for (const reg of guardados) {
      if (reg.estado !== EstadoAsistencia.AUSENTE) continue;

      const historial = await this.asistenciaRepo
        .createQueryBuilder('a')
        .innerJoinAndSelect('a.sesion', 's')
        .where('a.inscripcionId = :inscId', { inscId: reg.inscripcionId })
        .orderBy('s.fecha', 'DESC')
        .take(umbral + 2)
        .getMany();

      const consec = contarInasistenciasConsecutivas(
        historial.map((h) => h.estado),
      );
      if (consec >= umbral) {
        const insc = await this.inscripcionRepo.findOne({
          where: { id: reg.inscripcionId },
          relations: ['estudiante', 'estudiante.usuario'],
        });
        if (insc?.estudiante?.usuario) {
          alertasDesercion.push({
            usuarioId: insc.estudiante.usuario.id,
            correo: insc.estudiante.usuario.correo,
            estudianteNombre: `${insc.estudiante.nombres} ${insc.estudiante.apellidos}`,
            inasistenciasConsecutivas: consec,
          });
        }
      }
    }

    this.eventEmitter.emit('asistencia.registrada', {
      grupoId: grupo.id,
      grupoNombre: grupo.nombre,
      programaNombre: grupo.programa?.nombre || 'Programa',
      fecha: sesion.fecha,
      alertasDesercion,
    });

    return {
      sesionId: sesion.id,
      fecha: sesion.fecha,
      totalRegistrados: guardados.length,
      alertasGeneradas: alertasDesercion.length,
      registros: guardados,
    };
  }

  /**
   * Consolidado estadístico de asistencia por grupo (EDU-04).
   */
  async reporteAsistenciaGrupo(grupoId: string, user: RequestUser) {
    const grupo = await this.verificarAccesoGrupo(grupoId, user);
    const sesiones = await this.sesionRepo.find({
      where: { grupoId },
      order: { fecha: 'DESC' },
    });
    const inscripciones = await this.inscripcionRepo.find({
      where: { grupoId, estado: EstadoInscripcion.ACTIVA },
      relations: ['estudiante', 'asistencias', 'asistencias.sesion'],
    });

    const umbral = Number(
      this.configService.get<string>('DESERTION_ABSENCE_THRESHOLD') || 3,
    );

    const estudiantesResumen = inscripciones.map((insc) => {
      const asistenciasOrdenadas = [...(insc.asistencias || [])].sort((a, b) =>
        (b.sesion?.fecha || '').localeCompare(a.sesion?.fecha || ''),
      );
      const presentes = asistenciasOrdenadas.filter(
        (a) => a.estado === EstadoAsistencia.PRESENTE,
      ).length;
      const ausentes = asistenciasOrdenadas.filter(
        (a) => a.estado === EstadoAsistencia.AUSENTE,
      ).length;
      const excusados = asistenciasOrdenadas.filter(
        (a) => a.estado === EstadoAsistencia.EXCUSADO,
      ).length;
      const total = asistenciasOrdenadas.length;
      const porcentaje =
        total > 0 ? Math.round(((presentes + excusados * 0.5) / total) * 100) : 100;
      const inasistenciasConsecutivas = contarInasistenciasConsecutivas(
        asistenciasOrdenadas.map((a) => a.estado),
      );

      return {
        inscripcionId: insc.id,
        estudianteId: insc.estudiante.id,
        documento: insc.estudiante.documento,
        nombreCompleto: `${insc.estudiante.nombres} ${insc.estudiante.apellidos}`,
        totalSesionesRegistradas: total,
        presentes,
        ausentes,
        excusados,
        porcentajeAsistencia: porcentaje,
        inasistenciasConsecutivas,
        enRiesgoDesercion: inasistenciasConsecutivas >= umbral,
      };
    });

    const promedioGrupo =
      estudiantesResumen.length > 0
        ? Math.round(
            estudiantesResumen.reduce((acc, e) => acc + e.porcentajeAsistencia, 0) /
              estudiantesResumen.length,
          )
        : 0;

    return {
      grupo: {
        id: grupo.id,
        nombre: grupo.nombre,
        programa: grupo.programa?.nombre,
        periodo: grupo.periodo,
      },
      totalSesiones: sesiones.length,
      promedioAsistenciaGrupo: promedioGrupo,
      umbralDesercion: umbral,
      estudiantesEnRiesgo: estudiantesResumen.filter((e) => e.enRiesgoDesercion).length,
      estudiantes: estudiantesResumen,
    };
  }
}
