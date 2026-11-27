import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { Inscripcion } from './inscripcion.entity';
import { IndicadorEvaluacion } from './indicador-evaluacion.entity';
import { ConceptoEvaluacion } from '../../common/enums';

@Entity('evaluacion')
export class Evaluacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'inscripcion_id', type: 'uuid' })
  inscripcionId: string;

  @ManyToOne(() => Inscripcion, (i) => i.evaluaciones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inscripcion_id' })
  inscripcion: Inscripcion;

  @Index()
  @Column({ name: 'indicador_id', type: 'uuid' })
  indicadorId: string;

  @ManyToOne(() => IndicadorEvaluacion, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'indicador_id' })
  indicador: IndicadorEvaluacion;

  @Column({ type: 'varchar', length: 30 })
  concepto: ConceptoEvaluacion;

  @Column({ type: 'text', nullable: true })
  observacion: string | null;

  @Column({ type: 'varchar', length: 30, default: '2026-2' })
  periodo: string;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;
}
