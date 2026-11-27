export type RoleName =
  | 'ESTUDIANTE'
  | 'EDUCADOR'
  | 'ADMINISTRATIVO'
  | 'ADMINISTRADOR';

export type EstadoAsistencia = 'PRESENTE' | 'AUSENTE' | 'EXCUSADO';

export type ConceptoEvaluacion =
  | 'INICIAL'
  | 'EN_PROCESO'
  | 'DESTACADO'
  | 'SOBRESALIENTE';

export type FormatoExportacion = 'XLSX' | 'PDF' | 'CSV';

export interface UsuarioPerfil {
  id: string;
  correo: string;
  roles: RoleName[];
  debeCambiarClave: boolean;
  mfaActivo: boolean;
  mfaRecomendado?: boolean;
  activo: boolean;
  nombreCompleto: string;
  estudianteId?: string | null;
  educadorId?: string | null;
}

export interface Horario {
  id?: string;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
}

export interface IndicadorEvaluacion {
  id: string;
  nombre: string;
  descripcion: string;
  orden: number;
}

export interface GrupoPublico {
  id: string;
  nombre: string;
  periodo: string;
  cupoMax: number;
  inscritos: number;
  cuposDisponibles: number;
  activo: boolean;
  educador: {
    id: string;
    nombreCompleto: string;
    especialidad?: string;
  } | null;
  salon: {
    id: string;
    nombre: string;
    ubicacion: string;
    capacidad: number;
  } | null;
  horarios: Horario[];
}

export interface ProgramaPublico {
  id: string;
  nombre: string;
  descripcion: string;
  requisitos: string;
  edadMinima: number;
  edadMaxima: number | null;
  activo: boolean;
  indicadores: IndicadorEvaluacion[];
  grupos: GrupoPublico[];
}

export interface BarrioPereira {
  barrio: string;
  comuna: string;
  lat: number;
  lng: number;
}
