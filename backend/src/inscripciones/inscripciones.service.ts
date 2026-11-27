import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Estudiante, Grupo, Inscripcion } from '../database/entities';
import { EstadoInscripcion, RequestUser, RoleName } from '../common/enums';
import { CacheService } from '../common/cache/cache.service';
import { construirCadenaValidacionInscripcion } from './validadores.chain';
import { CancelarInscripcionDto, CrearInscripcionDto } from './inscripciones.dto';

export interface FiltrosMatriculados {
  programaId?: string;
  grupoId?: string;
  barrio?: string;
  comuna?: string;
  ciudadOrigen?: string;
  genero?: string;
  estado?: string;
  busqueda?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class InscripcionesService {
  constructor(
    @InjectRepository(Inscripcion)
    private readonly inscripcionRepo: Repository<Inscripcion>,
    @InjectRepository(Estudiante)
    private readonly estudianteRepo: Repository<Estudiante>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Inscripción transaccional atómica con bloqueo pesimista (SELECT ... FOR UPDATE)
   * para evitar sobreventa de cupos bajo concurrencia simultánea (EST-02, R13, Figura 8).
   */
  async inscribir(dto: CrearInscripcionDto, user: RequestUser) {
    let estudiante: Estudiante | null = null;
    const esAdmin =
      user.roles.includes(RoleName.ADMINISTRADOR) ||
      user.roles.includes(RoleName.ADMINISTRATIVO);

    if (esAdmin && dto.estudianteId) {
      estudiante = await this.estudianteRepo.findOne({
        where: { id: dto.estudianteId },
        relations: ['usuario'],
      });
    } else {
      estudiante = await this.estudianteRepo.findOne({
        where: { usuarioId: user.id },
        relations: ['usuario'],
      });
    }

    if (!estudiante) {
      throw new NotFoundException('Perfil de estudiante no encontrado');
    }

    const result = await this.dataSource.transaction(async (manager) => {
      // Bloqueo pesimista sobre el registro del grupo durante la transacción
      const grupoLocked = await manager
        .createQueryBuilder(Grupo, 'g')
        .setLock('pessimistic_write')
        .where('g.id = :id', { id: dto.grupoId })
        .getOne();

      if (!grupoLocked) {
        throw new NotFoundException('El grupo seleccionado no existe');
      }

      const grupo = await manager.findOne(Grupo, {
        where: { id: dto.grupoId },
        relations: ['programa', 'educador', 'salon'],
      });

      const inscritosActuales = await manager.count(Inscripcion, {
        where: { grupoId: dto.grupoId, estado: EstadoInscripcion.ACTIVA },
      });

      const existente = await manager.findOne(Inscripcion, {
        where: { estudianteId: estudiante!.id, grupoId: dto.grupoId },
      });

      const cadena = construirCadenaValidacionInscripcion();
      cadena.validar({
        estudiante: estudiante!,
        grupo: grupo!,
        programa: grupo!.programa,
        inscritosActuales,
        yaInscritoEnGrupo:
          !!existente && existente.estado === EstadoInscripcion.ACTIVA,
      });

      let inscripcion: Inscripcion;
      if (existente) {
        // Re-inscripción si previamente estaba cancelada
        existente.estado = EstadoInscripcion.ACTIVA;
        existente.fechaBaja = null;
        existente.motivo = null;
        existente.fecha = new Date();
        inscripcion = await manager.save(Inscripcion, existente);
      } else {
        inscripcion = await manager.save(
          Inscripcion,
          manager.create(Inscripcion, {
            estudianteId: estudiante!.id,
            grupoId: dto.grupoId,
            estado: EstadoInscripcion.ACTIVA,
          }),
        );
      }

      return { inscripcion, grupo: grupo! };
    });

    await this.cacheService.delByPrefix('dashboard:');

    // Publicar evento Observer para correo de confirmación (Figura 6 y 8)
    this.eventEmitter.emit('inscripcion.creada', {
      inscripcionId: result.inscripcion.id,
      usuarioId: estudiante.usuarioId,
      correo: estudiante.usuario?.correo || user.correo,
      estudianteNombre: `${estudiante.nombres} ${estudiante.apellidos}`,
      programaNombre: result.grupo.programa?.nombre || 'Programa',
      grupoNombre: result.grupo.nombre,
      salonNombre: result.grupo.salon
        ? `${result.grupo.salon.nombre} (${result.grupo.salon.ubicacion})`
        : 'Por confirmar',
      educadorNombre: result.grupo.educador
        ? `${result.grupo.educador.nombres} ${result.grupo.educador.apellidos}`
        : 'Por asignar',
    });

    return {
      id: result.inscripcion.id,
      estado: result.inscripcion.estado,
      fecha: result.inscripcion.fecha,
      grupo: result.grupo.nombre,
      programa: result.grupo.programa?.nombre,
      mensaje: 'Matrícula confirmada exitosamente.',
    };
  }

  async cancelar(id: string, dto: CancelarInscripcionDto, user: RequestUser) {
    const inscripcion = await this.inscripcionRepo.findOne({
      where: { id },
      relations: ['estudiante'],
    });
    if (!inscripcion) {
      throw new NotFoundException('Inscripción no encontrada');
    }

    const esAdmin =
      user.roles.includes(RoleName.ADMINISTRADOR) ||
      user.roles.includes(RoleName.ADMINISTRATIVO);

    if (!esAdmin && inscripcion.estudiante?.usuarioId !== user.id) {
      throw new ForbiddenException('No puede cancelar una inscripción ajena');
    }

    inscripcion.estado = esAdmin
      ? EstadoInscripcion.RETIRADA
      : EstadoInscripcion.CANCELADA;
    inscripcion.fechaBaja = new Date();
    inscripcion.motivo = dto.motivo || 'Cancelación solicitada';

    const saved = await this.inscripcionRepo.save(inscripcion);
    await this.cacheService.delByPrefix('dashboard:');
    return saved;
  }

  /**
   * Directorio de matriculados con filtros avanzados (ADM-02 y ADM-03).
   */
  async listarMatriculados(filtros: FiltrosMatriculados) {
    const page = Math.max(1, Number(filtros.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(filtros.limit) || 20));

    const qb = this.inscripcionRepo
      .createQueryBuilder('i')
      .innerJoinAndSelect('i.estudiante', 'e')
      .leftJoinAndSelect('e.usuario', 'u')
      .innerJoinAndSelect('i.grupo', 'g')
      .innerJoinAndSelect('g.programa', 'p')
      .leftJoinAndSelect('g.educador', 'ed')
      .leftJoinAndSelect('g.salon', 's')
      .orderBy('i.fecha', 'DESC');

    if (filtros.programaId) {
      qb.andWhere('p.id = :programaId', { programaId: filtros.programaId });
    }
    if (filtros.grupoId) {
      qb.andWhere('g.id = :grupoId', { grupoId: filtros.grupoId });
    }
    if (filtros.barrio) {
      qb.andWhere('LOWER(e.barrio) LIKE LOWER(:barrio)', {
        barrio: `%${filtros.barrio}%`,
      });
    }
    if (filtros.comuna) {
      qb.andWhere('LOWER(e.comuna) LIKE LOWER(:comuna)', {
        comuna: `%${filtros.comuna}%`,
      });
    }
    if (filtros.ciudadOrigen) {
      qb.andWhere('LOWER(e.ciudadOrigen) LIKE LOWER(:ciudadOrigen)', {
        ciudadOrigen: `%${filtros.ciudadOrigen}%`,
      });
    }
    if (filtros.genero) {
      qb.andWhere('LOWER(e.genero) = LOWER(:genero)', {
        genero: filtros.genero,
      });
    }
    if (filtros.estado) {
      qb.andWhere('i.estado = :estado', { estado: filtros.estado });
    }
    if (filtros.busqueda) {
      qb.andWhere(
        '(LOWER(e.nombres) LIKE LOWER(:q) OR LOWER(e.apellidos) LIKE LOWER(:q) OR e.documento LIKE :q OR LOWER(e.direccion) LIKE LOWER(:q))',
        { q: `%${filtros.busqueda}%` },
      );
    }

    const [rows, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const items = rows.map((i) => ({
      inscripcionId: i.id,
      estado: i.estado,
      fechaInscripcion: i.fecha,
      estudianteId: i.estudiante.id,
      tipoDocumento: i.estudiante.tipoDocumento,
      documento: i.estudiante.documento,
      nombreCompleto: `${i.estudiante.nombres} ${i.estudiante.apellidos}`,
      correo: i.estudiante.usuario?.correo || '',
      telefono: i.estudiante.telefono,
      genero: i.estudiante.genero,
      direccion: i.estudiante.direccion,
      barrio: i.estudiante.barrio,
      comuna: i.estudiante.comuna,
      ciudadOrigen: i.estudiante.ciudadOrigen,
      esMenor: i.estudiante.esMenor,
      acudienteNombre: i.estudiante.acudienteNombre,
      programaId: i.grupo.programa.id,
      programa: i.grupo.programa.nombre,
      grupoId: i.grupo.id,
      grupo: i.grupo.nombre,
      cohorte: i.grupo.periodo,
      educador: i.grupo.educador
        ? `${i.grupo.educador.nombres} ${i.grupo.educador.apellidos}`
        : 'Sin asignar',
      salon: i.grupo.salon?.nombre || 'Sin asignar',
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
