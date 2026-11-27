import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Programa } from './programa.entity';

@Entity('indicador_evaluacion')
export class IndicadorEvaluacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'programa_id', type: 'uuid' })
  programaId: string;

  @ManyToOne(() => Programa, (p) => p.indicadores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'programa_id' })
  programa: Programa;

  @Column({ type: 'varchar', length: 140 })
  nombre: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'int', default: 1 })
  orden: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
