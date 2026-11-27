import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Grupo } from './grupo.entity';

@Entity('horario')
export class Horario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'grupo_id', type: 'uuid' })
  grupoId: string;

  @ManyToOne(() => Grupo, (g) => g.horarios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'grupo_id' })
  grupo: Grupo;

  @Column({ name: 'dia_semana', type: 'varchar', length: 20 })
  diaSemana: string; // Lunes, Martes, Miércoles, Jueves, Viernes, Sábado

  @Column({ name: 'hora_inicio', type: 'varchar', length: 10 })
  horaInicio: string; // HH:mm

  @Column({ name: 'hora_fin', type: 'varchar', length: 10 })
  horaFin: string; // HH:mm
}
