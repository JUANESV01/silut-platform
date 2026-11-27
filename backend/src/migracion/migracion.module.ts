import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Estudiante,
  Grupo,
  Inscripcion,
  Rol,
  Usuario,
} from '../database/entities';
import { MigracionService } from './migracion.service';
import { MigracionController } from './migracion.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Estudiante, Usuario, Rol, Grupo, Inscripcion]),
  ],
  providers: [MigracionService],
  controllers: [MigracionController],
  exports: [MigracionService],
})
export class MigracionModule {}
