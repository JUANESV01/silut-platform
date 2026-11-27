import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('salon')
export class Salon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  nombre: string;

  @Column({ type: 'varchar', length: 200 })
  ubicacion: string;

  @Column({ type: 'int', default: 25 })
  capacidad: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
