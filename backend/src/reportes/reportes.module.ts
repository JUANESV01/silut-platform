import { Module } from '@nestjs/common';
import { InscripcionesModule } from '../inscripciones/inscripciones.module';
import {
  CsvExporter,
  ExportadorFactory,
  PdfExporter,
  XlsxExporter,
} from './exportadores.strategy';
import { ReportFacade } from './report.facade';
import { ReportesController } from './reportes.controller';

@Module({
  imports: [InscripcionesModule],
  providers: [
    XlsxExporter,
    PdfExporter,
    CsvExporter,
    ExportadorFactory,
    ReportFacade,
  ],
  controllers: [ReportesController],
  exports: [ReportFacade],
})
export class ReportesModule {}
