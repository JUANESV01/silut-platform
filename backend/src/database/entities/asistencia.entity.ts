import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
  UpdateDateColumn,
} from 'typeorm';
import { Sesion } from './sesion.entity';
import { Inscripcion } from './inscripcion.entity';
import { EstadoAsistencia } from '../../common/enums';

@Entity('asistencia')
@Unique('UQ_asistencia_sesion_inscripcion', ['sesionId', 'inscripcionId'])
export class Asistencia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'sesion_id', type: 'uuid' })
  sesionId: string;

  @ManyToOne(() => Sesion, (s) => s.asistencias, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sesion_id' })
  sesion: Sesion;

  @Index()
  @Column({ name: 'inscripcion_id', type: 'uuid' })
  inscripcionId: string;

  @ManyToOne(() => Inscripcion, (i) => i.asistencias, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inscripcion_id' })
  inscripcion: Inscripcion;

  @Column({ type: 'varchar', length: 20 })
  estado: EstadoAsistencia;

  @Column({ type: 'varchar', length: 255, nullable: true })
  observacion: string | null;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;
}
