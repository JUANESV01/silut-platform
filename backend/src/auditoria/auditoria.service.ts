import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Auditoria } from '../database/entities';

export interface RegistrarAuditoriaInput {
  usuarioId?: string | null;
  usuarioCorreo?: string | null;
  accion: string;
  entidad: string;
  entidadId?: string | null;
  detalle?: string | null;
  ip?: string | null;
  exitoso?: boolean;
}

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(
    @InjectRepository(Auditoria)
    private readonly auditoriaRepo: Repository<Auditoria>,
  ) {}

  @OnEvent('auditoria.registrar')
  async registrar(input: RegistrarAuditoriaInput): Promise<Auditoria | null> {
    try {
      const registro = this.auditoriaRepo.create({
        usuarioId: input.usuarioId ?? null,
        usuarioCorreo: input.usuarioCorreo ?? null,
        accion: input.accion,
        entidad: input.entidad,
        entidadId: input.entidadId ?? null,
        detalle: input.detalle ?? null,
        ip: input.ip ?? null,
        exitoso: input.exitoso ?? true,
      });
      return await this.auditoriaRepo.save(registro);
    } catch (err) {
      this.logger.error(`Error guardando auditoría: ${(err as Error).message}`);
      return null;
    }
  }

  async listar(filtros: {
    accion?: string;
    entidad?: string;
    correo?: string;
    exitoso?: string;
    desde?: string;
    hasta?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(filtros.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filtros.limit) || 25));

    const qb = this.auditoriaRepo
      .createQueryBuilder('a')
      .orderBy('a.fecha', 'DESC');

    if (filtros.accion) {
      qb.andWhere('LOWER(a.accion) LIKE LOWER(:accion)', {
        accion: `%${filtros.accion}%`,
      });
    }
    if (filtros.entidad) {
      qb.andWhere('LOWER(a.entidad) LIKE LOWER(:entidad)', {
        entidad: `%${filtros.entidad}%`,
      });
    }
    if (filtros.correo) {
      qb.andWhere('LOWER(a.usuarioCorreo) LIKE LOWER(:correo)', {
        correo: `%${filtros.correo}%`,
      });
    }
    if (filtros.exitoso === 'true' || filtros.exitoso === 'false') {
      qb.andWhere('a.exitoso = :exitoso', {
        exitoso: filtros.exitoso === 'true',
      });
    }
    if (filtros.desde) {
      qb.andWhere('a.fecha >= :desde', { desde: new Date(filtros.desde) });
    }
    if (filtros.hasta) {
      qb.andWhere('a.fecha <= :hasta', { hasta: new Date(filtros.hasta) });
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const fallidosRecientes = await this.auditoriaRepo
      .createQueryBuilder('a')
      .where('a.exitoso = false')
      .andWhere("a.fecha >= NOW() - INTERVAL '24 hours'")
      .getCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      resumen: {
        fallidosUltimas24h: fallidosRecientes,
      },
    };
  }
}
