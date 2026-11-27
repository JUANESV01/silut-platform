import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Educador,
  Evaluacion,
  IndicadorEvaluacion,
  Inscripcion,
} from '../database/entities';
import { EvaluacionService } from './evaluacion.service';
import { EvaluacionController } from './evaluacion.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Evaluacion,
      Inscripcion,
      IndicadorEvaluacion,
      Educador,
    ]),
  ],
  providers: [EvaluacionService],
  controllers: [EvaluacionController],
  exports: [EvaluacionService],
})
export class EvaluacionModule {}
