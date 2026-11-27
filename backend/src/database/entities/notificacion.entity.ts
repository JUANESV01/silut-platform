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
import { EstadoEnvioNotificacion } from '../../common/enums';

@Entity('notificacion')
export class Notificacion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'usuario_id', type: 'uuid', nullable: true })
  usuarioId: string | null;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario | null;

  @Column({ type: 'varchar', length: 60 })
  tipo: string;

  @Column({ type: 'varchar', length: 200 })
  asunto: string;

  @Column({ type: 'text' })
  mensaje: string;

  @Column({ name: 'destinatario_correo', type: 'varchar', length: 180 })
  destinatarioCorreo: string;

  @Column({
    name: 'estado_envio',
    type: 'varchar',
    length: 20,
    default: EstadoEnvioNotificacion.PENDIENTE,
  })
  estadoEnvio: EstadoEnvioNotificacion;

  @Column({ type: 'boolean', default: false })
  leida: boolean;

  @CreateDateColumn({ name: 'creada_en', type: 'timestamptz' })
  creadaEn: Date;
}
