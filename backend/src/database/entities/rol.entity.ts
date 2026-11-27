import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { RoleName } from '../../common/enums';

@Entity('rol')
export class Rol {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  nombre: RoleName;

  @Column({ type: 'varchar', length: 200, nullable: true })
  descripcion: string;
}
