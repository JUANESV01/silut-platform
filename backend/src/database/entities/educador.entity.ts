import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('educador')
export class Educador {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'usuario_id', type: 'uuid', unique: true })
  usuarioId: string;

  @OneToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ name: 'tipo_documento', type: 'varchar', length: 10, default: 'CC' })
  tipoDocumento: string;

  @Index()
  @Column({ type: 'varchar', length: 40, unique: true })
  documento: string;

  @Column({ type: 'varchar', length: 120 })
  nombres: string;

  @Column({ type: 'varchar', length: 120 })
  apellidos: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  especialidad: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  telefono: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
