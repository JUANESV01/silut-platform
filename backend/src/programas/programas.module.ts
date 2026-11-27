import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Educador,
  Grupo,
  Horario,
  IndicadorEvaluacion,
  Inscripcion,
  Programa,
  Salon,
} from '../database/entities';
import { ProgramasService } from './programas.service';
import { ProgramasController } from './programas.controller';
import { GruposController } from './grupos.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Programa,
      IndicadorEvaluacion,
      Salon,
      Grupo,
      Horario,
      Educador,
      Inscripcion,
    ]),
  ],
  providers: [ProgramasService],
  controllers: [ProgramasController, GruposController],
  exports: [ProgramasService],
})
export class ProgramasModule {}
