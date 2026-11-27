import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Educador,
  Evaluacion,
  IndicadorEvaluacion,
  Inscripcion,
} from '../database/entities';
import { RequestUser, RoleName } from '../common/enums';
import { CacheService } from '../common/cache/cache.service';
import { RegistrarEvaluacionDto } from './evaluacion.dto';

@Injectable()
export class EvaluacionService {
  constructor(
    @InjectRepository(Evaluacion)
    private readonly evaluacionRepo: Repository<Evaluacion>,
    @InjectRepository(Inscripcion)
    private readonly inscripcionRepo: Repository<Inscripcion>,
    @InjectRepository(IndicadorEvaluacion)
    private readonly indicadorRepo: Repository<IndicadorEvaluacion>,
    @InjectRepository(Educador)
    private readonly educadorRepo: Repository<Educador>,
    private readonly eventEmitter: EventEmitter2,
    private readonly cacheService: CacheService,
  ) {}

  async registrar(dto: RegistrarEvaluacionDto, user: RequestUser) {
    const inscripcion = await this.inscripcionRepo.findOne({
      where: { id: dto.inscripcionId },
      relations: ['grupo', 'grupo.programa', 'estudiante', 'estudiante.usuario'],
    });
    if (!inscripcion) throw new NotFoundException('Inscripción no encontrada');

    const esAdmin =
      user.roles.includes(RoleName.ADMINISTRADOR) ||
      user.roles.includes(RoleName.ADMINISTRATIVO);

    if (!esAdmin) {
      const educador = await this.educadorRepo.findOne({
        where: { usuarioId: user.id },
      });
      if (!educador || inscripcion.grupo.educadorId !== educador.id) {
        throw new ForbiddenException(
          'Solo el educador asignado al grupo puede registrar evaluaciones cualitativas.',
        );
      }
    }

    const indicador = await this.indicadorRepo.findOne({
      where: { id: dto.indicadorId },
    });
    if (!indicador || indicador.programaId !== inscripcion.grupo.programaId) {
      throw new UnprocessableEntityException(
        'El indicador cualitativo no pertenece al programa de esta inscripción.',
      );
    }

    const periodo = dto.periodo || inscripcion.grupo.periodo || '2026-2';
    let evaluacion = await this.evaluacionRepo.findOne({
      where: {
        inscripcionId: dto.inscripcionId,
        indicadorId: dto.indicadorId,
        periodo,
      },
    });

    if (evaluacion) {
      evaluacion.concepto = dto.concepto;
      evaluacion.observacion = dto.observacion ?? evaluacion.observacion;
      evaluacion.fecha = new Date();
    } else {
      evaluacion = this.evaluacionRepo.create({
        inscripcionId: dto.inscripcionId,
        indicadorId: dto.indicadorId,
        concepto: dto.concepto,
        observacion: dto.observacion || null,
        periodo,
      });
    }

    const saved = await this.evaluacionRepo.save(evaluacion);
    await this.cacheService.delByPrefix('dashboard:');

    if (inscripcion.estudiante?.usuario) {
      this.eventEmitter.emit('evaluacion.registrada', {
        usuarioId: inscripcion.estudiante.usuario.id,
        correo: inscripcion.estudiante.usuario.correo,
        estudianteNombre: `${inscripcion.estudiante.nombres} ${inscripcion.estudiante.apellidos}`,
        programaNombre: inscripcion.grupo.programa?.nombre || 'Programa',
        indicadorNombre: indicador.nombre,
        concepto: dto.concepto,
      });
    }

    return saved;
  }

  async listarPorGrupo(grupoId: string, user: RequestUser) {
    const esAdmin =
      user.roles.includes(RoleName.ADMINISTRADOR) ||
      user.roles.includes(RoleName.ADMINISTRATIVO);

    const inscripciones = await this.inscripcionRepo.find({
      where: { grupoId },
      relations: ['grupo', 'estudiante', 'evaluaciones', 'evaluaciones.indicador'],
    });

    if (!esAdmin && inscripciones.length > 0) {
      const educador = await this.educadorRepo.findOne({
        where: { usuarioId: user.id },
      });
      if (!educador || inscripciones[0].grupo.educadorId !== educador.id) {
        throw new ForbiddenException('No tiene permiso sobre este grupo');
      }
    }

    return inscripciones.map((i) => ({
      inscripcionId: i.id,
      estudianteId: i.estudiante.id,
      nombreCompleto: `${i.estudiante.nombres} ${i.estudiante.apellidos}`,
      documento: i.estudiante.documento,
      evaluaciones: (i.evaluaciones || []).map((ev) => ({
        id: ev.id,
        indicadorId: ev.indicadorId,
        indicadorNombre: ev.indicador?.nombre,
        concepto: ev.concepto,
        observacion: ev.observacion,
        periodo: ev.periodo,
        fecha: ev.fecha,
      })),
    }));
  }
}
