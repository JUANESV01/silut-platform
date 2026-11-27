export enum RoleName {
  ESTUDIANTE = 'ESTUDIANTE',
  EDUCADOR = 'EDUCADOR',
  ADMINISTRATIVO = 'ADMINISTRATIVO',
  ADMINISTRADOR = 'ADMINISTRADOR',
}

export enum EstadoInscripcion {
  ACTIVA = 'ACTIVA',
  CANCELADA = 'CANCELADA',
  RETIRADA = 'RETIRADA',
  COMPLETADA = 'COMPLETADA',
}

export enum EstadoAsistencia {
  PRESENTE = 'PRESENTE',
  AUSENTE = 'AUSENTE',
  EXCUSADO = 'EXCUSADO',
}

export enum ConceptoEvaluacion {
  INICIAL = 'INICIAL',
  EN_PROCESO = 'EN_PROCESO',
  DESTACADO = 'DESTACADO',
  SOBRESALIENTE = 'SOBRESALIENTE',
}

export enum EstadoEnvioNotificacion {
  PENDIENTE = 'PENDIENTE',
  ENVIADO = 'ENVIADO',
  FALLIDO = 'FALLIDO',
}

export enum FormatoExportacion {
  XLSX = 'XLSX',
  PDF = 'PDF',
  CSV = 'CSV',
}

export interface JwtPayload {
  sub: string;
  correo: string;
  roles: RoleName[];
  debeCambiarClave: boolean;
  mfaVerified?: boolean;
  jti?: string;
}

export interface RequestUser {
  id: string;
  correo: string;
  roles: RoleName[];
  debeCambiarClave: boolean;
}
