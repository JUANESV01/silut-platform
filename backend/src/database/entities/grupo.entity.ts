import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Programa } from './programa.entity';
import { Educador } from './educador.entity';
import { Salon } from './salon.entity';
import { Horario } from './horario.entity';
import { Inscripcion } from './inscripcion.entity';
import { Sesion } from './sesion.entity';

@Entity('grupo')
export class Grupo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'programa_id', type: 'uuid' })
  programaId: string;

  @ManyToOne(() => Programa, (p) => p.grupos, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'programa_id' })
  programa: Programa;

  @Index()
  @Column({ name: 'educador_id', type: 'uuid' })
  educadorId: string;

  @ManyToOne(() => Educador, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'educador_id' })
  educador: Educador;

  @Index()
  @Column({ name: 'salon_id', type: 'uuid' })
  salonId: string;

  @ManyToOne(() => Salon, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'salon_id' })
  salon: Salon;

  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @Column({ name: 'cupo_max', type: 'int', default: 25 })
  cupoMax: number;

  @Index()
  @Column({ type: 'varchar', length: 30, default: '2026-2' })
  periodo: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @OneToMany(() => Horario, (h) => h.grupo)
  horarios: Horario[];

  @OneToMany(() => Inscripcion, (i) => i.grupo)
  inscripciones: Inscripcion[];

  @OneToMany(() => Sesion, (s) => s.grupo)
  sesiones: Sesion[];
}
