import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Asistencia,
  Educador,
  Grupo,
  Inscripcion,
  Sesion,
} from '../database/entities';
import { AsistenciaService } from './asistencia.service';
import { AsistenciaController } from './asistencia.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sesion, Asistencia, Grupo, Educador, Inscripcion]),
  ],
  providers: [AsistenciaService],
  controllers: [AsistenciaController],
  exports: [AsistenciaService],
})
export class AsistenciaModule {}
