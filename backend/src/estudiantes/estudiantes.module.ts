import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Asistencia,
  Estudiante,
  Evaluacion,
  Inscripcion,
  Rol,
  Usuario,
} from '../database/entities';
import { EstudiantesService } from './estudiantes.service';
import { EstudiantesController } from './estudiantes.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Estudiante,
      Usuario,
      Rol,
      Inscripcion,
      Asistencia,
      Evaluacion,
    ]),
  ],
  providers: [EstudiantesService],
  controllers: [EstudiantesController],
  exports: [EstudiantesService],
})
export class EstudiantesModule {}
