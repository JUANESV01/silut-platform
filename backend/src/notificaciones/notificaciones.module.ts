import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notificacion } from '../database/entities';
import { MAIL_ADAPTER, SmtpMailAdapter } from './mail.adapter';
import { NotificacionesService } from './notificaciones.service';
import {
  NotifAsistenciaListener,
  NotifCredencialesListener,
  NotifEvaluacionListener,
  NotifHorarioListener,
  NotifMatriculaListener,
  NotifRecuperacionClaveListener,
} from './notificaciones.listeners';
import { NotificacionesController } from './notificaciones.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Notificacion])],
  providers: [
    { provide: MAIL_ADAPTER, useClass: SmtpMailAdapter },
    NotificacionesService,
    NotifCredencialesListener,
    NotifRecuperacionClaveListener,
    NotifMatriculaListener,
    NotifAsistenciaListener,
    NotifHorarioListener,
    NotifEvaluacionListener,
  ],
  controllers: [NotificacionesController],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
