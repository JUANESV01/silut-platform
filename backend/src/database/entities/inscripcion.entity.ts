import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Unique,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { Estudiante } from './estudiante.entity';
import { Grupo } from './grupo.entity';
import { Asistencia } from './asistencia.entity';
import { Evaluacion } from './evaluacion.entity';
import { EstadoInscripcion } from '../../common/enums';

@Entity('inscripcion')
@Unique('UQ_inscripcion_estudiante_grupo', ['estudianteId', 'grupoId'])
export class Inscripcion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'estudiante_id', type: 'uuid' })
  estudianteId: string;

  @ManyToOne(() => Estudiante, (e) => e.inscripciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'estudiante_id' })
  estudiante: Estudiante;

  @Index()
  @Column({ name: 'grupo_id', type: 'uuid' })
  grupoId: string;

  @ManyToOne(() => Grupo, (g) => g.inscripciones, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'grupo_id' })
  grupo: Grupo;

  @Index()
  @Column({ type: 'varchar', length: 20, default: EstadoInscripcion.ACTIVA })
  estado: EstadoInscripcion;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;

  @Column({ name: 'fecha_baja', type: 'timestamptz', nullable: true })
  fechaBaja: Date | null;

  @Column({ type: 'text', nullable: true })
  motivo: string | null;

  @OneToMany(() => Asistencia, (a) => a.inscripcion)
  asistencias: Asistencia[];

  @OneToMany(() => Evaluacion, (ev) => ev.inscripcion)
  evaluaciones: Evaluacion[];
}
