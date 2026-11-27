import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Asistencia,
  Educador,
  Estudiante,
  Evaluacion,
  Grupo,
  Inscripcion,
  Programa,
  Sesion,
} from '../database/entities';
import { DashboardsService } from './dashboards.service';
import { DashboardsController } from './dashboards.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Estudiante,
      Programa,
      Grupo,
      Educador,
      Inscripcion,
      Sesion,
      Asistencia,
      Evaluacion,
    ]),
  ],
  providers: [DashboardsService],
  controllers: [DashboardsController],
  exports: [DashboardsService],
})
export class DashboardsModule {}
