import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { IndicadorEvaluacion } from './indicador-evaluacion.entity';
import { Grupo } from './grupo.entity';

@Entity('programa')
export class Programa {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'text', nullable: true })
  requisitos: string;

  @Column({ name: 'edad_minima', type: 'int', default: 6 })
  edadMinima: number;

  @Column({ name: 'edad_maxima', type: 'int', nullable: true })
  edadMaxima: number | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @OneToMany(() => IndicadorEvaluacion, (ind) => ind.programa)
  indicadores: IndicadorEvaluacion[];

  @OneToMany(() => Grupo, (grupo) => grupo.programa)
  grupos: Grupo[];
}
