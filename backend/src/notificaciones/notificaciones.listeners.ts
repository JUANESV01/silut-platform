import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificacionesService } from './notificaciones.service';

export interface CredencialesCreadasEvent {
  usuarioId: string;
  correo: string;
  nombreCompleto: string;
  claveTemporal: string;
}

export interface InscripcionCreadaEvent {
  inscripcionId: string;
  usuarioId: string;
  correo: string;
  estudianteNombre: string;
  programaNombre: string;
  grupoNombre: string;
  salonNombre: string;
  educadorNombre: string;
}

export interface AsistenciaRegistradaEvent {
  grupoId: string;
  grupoNombre: string;
  programaNombre: string;
  fecha: string;
  alertasDesercion: Array<{
    usuarioId: string;
    correo: string;
    estudianteNombre: string;
    inasistenciasConsecutivas: number;
  }>;
}

export interface HorarioModificadoEvent {
  grupoNombre: string;
  programaNombre: string;
  destinatarios: Array<{ usuarioId: string; correo: string; nombre: string }>;
  nuevoHorario: string;
}

export interface EvaluacionRegistradaEvent {
  usuarioId: string;
  correo: string;
  estudianteNombre: string;
  programaNombre: string;
  indicadorNombre: string;
  concepto: string;
}

export interface RecuperacionClaveEvent {
  usuarioId: string;
  correo: string;
  codigo: string;
  expiracionMinutos: number;
}

@Injectable()
export class NotifRecuperacionClaveListener {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @OnEvent('usuario.recuperacion_clave')
  async manejar(e: RecuperacionClaveEvent) {
    await this.notificacionesService.encolar({
      usuarioId: e.usuarioId,
      tipo: 'RECUPERACION_CLAVE',
      destinatarioCorreo: e.correo,
      asunto: 'SILUT · Código de recuperación de contraseña',
      mensaje:
        `Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en SILUT (Centro Cultural Lucy Tejada).\n\n` +
        `Código de verificación: ${e.codigo}\n` +
        `Vigencia: ${e.expiracionMinutos} minutos (de un solo uso).\n\n` +
        `Si no realizaste esta solicitud, puedes ignorar este mensaje de forma segura.\n\n` +
        `SILUT · Centro Cultural Lucy Tejada — Pereira`,
      prioridad: 1,
    });
  }
}

/**
 * Patrón Observer (Entrega 2, Figura 6 y Sec. 5.1).
 * Los módulos de negocio emiten eventos de dominio sin acoplarse al envío de correos.
 */
@Injectable()
export class NotifCredencialesListener {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @OnEvent('usuario.credenciales_creadas')
  async manejar(e: CredencialesCreadasEvent) {
    // Mitigación R10: no incluir número de documento de identidad en el correo
    await this.notificacionesService.encolar({
      usuarioId: e.usuarioId,
      tipo: 'CREDENCIALES',
      destinatarioCorreo: e.correo,
      asunto: 'Bienvenido(a) a SILUT · Centro Cultural Lucy Tejada — Credenciales de acceso',
      mensaje:
        `Hola ${e.nombreCompleto},\n\n` +
        `Tu registro en SILUT (Sistema de Información Institucional del Centro Cultural Lucy Tejada) se realizó con éxito.\n` +
        `Usuario: ${e.correo}\n` +
        `Contraseña temporal: ${e.claveTemporal}\n\n` +
        `Por seguridad, en tu primer inicio de sesión el sistema te solicitará definir una nueva contraseña personal.\n\n` +
        `SILUT · Centro Cultural Lucy Tejada — Pereira`,
      prioridad: 1, // Mayor prioridad en la cola (Sec. 5.2.2)
    });
  }
}

@Injectable()
export class NotifMatriculaListener {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @OnEvent('inscripcion.creada')
  async manejar(e: InscripcionCreadaEvent) {
    await this.notificacionesService.encolar({
      usuarioId: e.usuarioId,
      tipo: 'MATRICULA',
      destinatarioCorreo: e.correo,
      asunto: `Matrícula confirmada · ${e.programaNombre}`,
      mensaje:
        `Hola ${e.estudianteNombre},\n\n` +
        `Tu inscripción al programa "${e.programaNombre}" (Grupo: ${e.grupoNombre}) ha sido confirmada.\n` +
        `Formador asignado: ${e.educadorNombre}\n` +
        `Salón: ${e.salonNombre}\n\n` +
        `Puedes consultar tus horarios y progreso académico en cualquier momento desde la plataforma GEA.`,
      prioridad: 2,
    });
  }
}

@Injectable()
export class NotifAsistenciaListener {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @OnEvent('asistencia.registrada')
  async manejar(e: AsistenciaRegistradaEvent) {
    for (const alerta of e.alertasDesercion) {
      await this.notificacionesService.encolar({
        usuarioId: alerta.usuarioId,
        tipo: 'ALERTA_ASISTENCIA',
        destinatarioCorreo: alerta.correo,
        asunto: `Recordatorio de asistencia · ${e.programaNombre}`,
        mensaje:
          `Hola ${alerta.estudianteNombre},\n\n` +
          `Hemos registrado ${alerta.inasistenciasConsecutivas} inasistencias consecutivas en el grupo ${e.grupoNombre} (${e.programaNombre}).\n` +
          `Te invitamos a comunicarte con tu formador o con la coordinación del Centro Cultural Lucy Tejada para continuar tu proceso artístico.`,
        prioridad: 3,
      });
    }
  }
}

@Injectable()
export class NotifHorarioListener {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @OnEvent('horario.modificado')
  async manejar(e: HorarioModificadoEvent) {
    for (const dest of e.destinatarios) {
      await this.notificacionesService.encolar({
        usuarioId: dest.usuarioId,
        tipo: 'CAMBIO_HORARIO',
        destinatarioCorreo: dest.correo,
        asunto: `Actualización de horario · ${e.programaNombre} (${e.grupoNombre})`,
        mensaje:
          `Hola ${dest.nombre},\n\n` +
          `Te informamos que el horario del grupo ${e.grupoNombre} (${e.programaNombre}) ha sido actualizado:\n` +
          `${e.nuevoHorario}\n\n` +
          `Centro Cultural Lucy Tejada · Pereira`,
        prioridad: 2,
      });
    }
  }
}

@Injectable()
export class NotifEvaluacionListener {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @OnEvent('evaluacion.registrada')
  async manejar(e: EvaluacionRegistradaEvent) {
    await this.notificacionesService.encolar({
      usuarioId: e.usuarioId,
      tipo: 'EVALUACION',
      destinatarioCorreo: e.correo,
      asunto: `Nuevo avance cualitativo · ${e.programaNombre}`,
      mensaje:
        `Hola ${e.estudianteNombre},\n\n` +
        `Tu educador ha registrado una nueva valoración cualitativa en ${e.programaNombre}.\n` +
        `Indicador: ${e.indicadorNombre}\n` +
        `Concepto: ${e.concepto}\n\n` +
        `Ingresa a la plataforma GEA para revisar las observaciones formativas.`,
      prioridad: 4,
    });
  }
}
