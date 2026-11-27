import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { Usuario } from './usuario.entity';
import { Inscripcion } from './inscripcion.entity';

@Entity('estudiante')
export class Estudiante {
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

  @Column({ name: 'fecha_nacimiento', type: 'date' })
  fechaNacimiento: string;

  @Index()
  @Column({ type: 'varchar', length: 30 })
  genero: string;

  @Column({ type: 'varchar', length: 40 })
  telefono: string;

  @Column({ type: 'varchar', length: 220 })
  direccion: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  barrio: string;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  comuna: string;

  @Index()
  @Column({ name: 'ciudad_origen', type: 'varchar', length: 100, default: 'Pereira' })
  ciudadOrigen: string;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  latitud: number | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  longitud: number | null;

  // Ley 1581 de 2012 y Decreto 1377 de 2013 - Menores de edad y consentimiento
  @Column({ name: 'es_menor', type: 'boolean', default: false })
  esMenor: boolean;

  @Column({ name: 'acudiente_nombre', type: 'varchar', length: 160, nullable: true })
  acudienteNombre: string | null;

  @Column({ name: 'acudiente_documento', type: 'varchar', length: 40, nullable: true })
  acudienteDocumento: string | null;

  @Column({ name: 'acudiente_telefono', type: 'varchar', length: 40, nullable: true })
  acudienteTelefono: string | null;

  @Column({ name: 'acudiente_correo', type: 'varchar', length: 180, nullable: true })
  acudienteCorreo: string | null;

  @Column({ name: 'acudiente_parentesco', type: 'varchar', length: 60, nullable: true })
  acudienteParentesco: string | null;

  @Column({ name: 'consentimiento_datos', type: 'boolean', default: false })
  consentimientoDatos: boolean;

  @Column({ name: 'consentimiento_fecha', type: 'timestamptz', nullable: true })
  consentimientoFecha: Date | null;

  @Column({ name: 'consentimiento_version', type: 'varchar', length: 30, default: 'v1.0-2026' })
  consentimientoVersion: string;

  @OneToMany(() => Inscripcion, (i) => i.estudiante)
  inscripciones: Inscripcion[];

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;
}
