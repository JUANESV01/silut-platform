import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('auditoria')
export class Auditoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'usuario_id', type: 'uuid', nullable: true })
  usuarioId: string | null;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario | null;

  @Column({ name: 'usuario_correo', type: 'varchar', length: 180, nullable: true })
  usuarioCorreo: string | null;

  @Index()
  @Column({ type: 'varchar', length: 80 })
  accion: string;

  @Index()
  @Column({ type: 'varchar', length: 80 })
  entidad: string;

  @Column({ name: 'entidad_id', type: 'varchar', length: 100, nullable: true })
  entidadId: string | null;

  @Column({ type: 'text', nullable: true })
  detalle: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @Column({ type: 'boolean', default: true })
  exitoso: boolean;

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;
}
