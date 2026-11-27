import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Estudiante, Grupo, Inscripcion } from '../database/entities';
import { InscripcionesService } from './inscripciones.service';
import { InscripcionesController } from './inscripciones.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Inscripcion, Estudiante, Grupo])],
  providers: [InscripcionesService],
  controllers: [InscripcionesController],
  exports: [InscripcionesService],
})
export class InscripcionesModule {}
