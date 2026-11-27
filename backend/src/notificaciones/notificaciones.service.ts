import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { Notificacion } from '../database/entities';
import { EstadoEnvioNotificacion } from '../common/enums';
import { MAIL_ADAPTER, MailAdapter } from './mail.adapter';

export interface EncolarNotificacionInput {
  usuarioId?: string | null;
  tipo: string;
  asunto: string;
  mensaje: string;
  destinatarioCorreo: string;
  prioridad?: number;
}

/**
 * Servicio de Notificaciones con soporte BullMQ + Redis (Entrega 2, AD-6, AD-7)
 * y degradación controlada a procesamiento asíncrono en segundo plano si Redis no está disponible.
 */
@Injectable()
export class NotificacionesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificacionesService.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;

  constructor(
    @InjectRepository(Notificacion)
    private readonly notifRepo: Repository<Notificacion>,
    @Inject(MAIL_ADAPTER)
    private readonly mailAdapter: MailAdapter,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) return;

    try {
      const url = new URL(redisUrl);
      const connection = {
        host: url.hostname,
        port: Number(url.port || 6379),
        password: url.password || undefined,
        maxRetriesPerRequest: null,
      };
      this.queue = new Queue('gea-notificaciones', { connection });
      this.worker = new Worker(
        'gea-notificaciones',
        async (job) => {
          await this.procesarEnvio(job.data.notificacionId);
        },
        { connection },
      );
      this.worker.on('failed', (job, err) => {
        this.logger.warn(`Job correo fallido (${job?.id}): ${err.message}`);
      });
      this.logger.log('Worker BullMQ de notificaciones inicializado sobre Redis.');
    } catch (err) {
      this.logger.warn(
        `BullMQ no inicializado (${(err as Error).message}), usando cola asíncrona local.`,
      );
      this.queue = null;
      this.worker = null;
    }
  }

  async onModuleDestroy() {
    if (this.worker) await this.worker.close().catch(() => undefined);
    if (this.queue) await this.queue.close().catch(() => undefined);
  }

  async encolar(input: EncolarNotificacionInput): Promise<Notificacion> {
    const notif = this.notifRepo.create({
      usuarioId: input.usuarioId ?? null,
      tipo: input.tipo,
      asunto: input.asunto,
      mensaje: input.mensaje,
      destinatarioCorreo: input.destinatarioCorreo,
      estadoEnvio: EstadoEnvioNotificacion.PENDIENTE,
      leida: false,
    });
    const saved = await this.notifRepo.save(notif);

    if (this.queue) {
      try {
        await this.queue.add(
          'enviar-correo',
          { notificacionId: saved.id },
          {
            priority: input.prioridad ?? 5,
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
          },
        );
        return saved;
      } catch (err) {
        this.logger.warn(`Fallback local para notificación ${saved.id}: ${(err as Error).message}`);
      }
    }

    // Procesamiento asíncrono sin bloquear el request HTTP (Táctica: introducir concurrencia)
    setImmediate(() => {
      this.procesarEnvio(saved.id).catch((e) =>
        this.logger.error(`Error procesando notificación ${saved.id}: ${e.message}`),
      );
    });

    return saved;
  }

  async procesarEnvio(notificacionId: string): Promise<void> {
    const notif = await this.notifRepo.findOne({ where: { id: notificacionId } });
    if (!notif) return;

    const result = await this.mailAdapter.enviar({
      to: notif.destinatarioCorreo,
      subject: notif.asunto,
      body: notif.mensaje,
    });

    notif.estadoEnvio = result.delivered
      ? EstadoEnvioNotificacion.ENVIADO
      : EstadoEnvioNotificacion.FALLIDO;
    await this.notifRepo.save(notif);
  }

  async listarPorUsuario(usuarioId: string) {
    return this.notifRepo.find({
      where: { usuarioId },
      order: { creadaEn: 'DESC' },
      take: 50,
    });
  }

  async listarTodas(limit = 50) {
    return this.notifRepo.find({
      order: { creadaEn: 'DESC' },
      take: Math.min(200, limit),
    });
  }

  async marcarLeida(id: string, usuarioId: string) {
    const notif = await this.notifRepo.findOne({ where: { id, usuarioId } });
    if (!notif) return null;
    notif.leida = true;
    return this.notifRepo.save(notif);
  }
}
