import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Grupo } from './grupo.entity';
import { Asistencia } from './asistencia.entity';

@Entity('sesion')
@Unique('UQ_sesion_grupo_fecha', ['grupoId', 'fecha'])
export class Sesion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'grupo_id', type: 'uuid' })
  grupoId: string;

  @ManyToOne(() => Grupo, (g) => g.sesiones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'grupo_id' })
  grupo: Grupo;

  @Index()
  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  tema: string | null;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @OneToMany(() => Asistencia, (a) => a.sesion)
  asistencias: Asistencia[];
}
