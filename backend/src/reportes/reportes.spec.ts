import {
  CsvExporter,
  ExportadorFactory,
  PdfExporter,
  XlsxExporter,
} from './exportadores.strategy';
import { ReportFacade } from './report.facade';
import { FormatoExportacion } from '../common/enums';

describe('Reportes - Strategy, Factory Method y ReportFacade (ADM-04 / M3 / R4)', () => {
  const columnas = [
    { key: 'documento', header: 'Documento' },
    { key: 'nombreCompleto', header: 'Estudiante' },
  ];
  const filas = [
    { documento: '1088123', nombreCompleto: 'Valentina Ospina' },
    { documento: '1088456', nombreCompleto: 'Mateo Cárdenas' },
  ];

  const xlsx = new XlsxExporter();
  const pdf = new PdfExporter();
  const csv = new CsvExporter();
  const factory = new ExportadorFactory(xlsx, pdf, csv);

  it('genera archivo CSV válido con encabezados y filas', async () => {
    const res = await factory.obtener(FormatoExportacion.CSV).exportar('Test', columnas, filas);
    expect(res.extension).toBe('csv');
    expect(res.buffer.toString('utf-8')).toContain('Valentina Ospina');
  });

  it('genera archivo XLSX válido con ExcelJS', async () => {
    const res = await factory.obtener(FormatoExportacion.XLSX).exportar('Test', columnas, filas);
    expect(res.extension).toBe('xlsx');
    expect(res.buffer.length).toBeGreaterThan(500);
  });

  it('genera archivo PDF válido con cabecera %PDF', async () => {
    const res = await factory.obtener(FormatoExportacion.PDF).exportar('Test', columnas, filas);
    expect(res.extension).toBe('pdf');
    expect(res.buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('ReportFacade encola reporte asíncrono y permite consultar estado', async () => {
    const mockInscripciones: any = {
      listarMatriculados: jest.fn().mockResolvedValue({ items: filas }),
    };
    const facade = new ReportFacade(mockInscripciones, factory);
    const job = await facade.solicitarReporteAsincrono(FormatoExportacion.CSV, {});
    expect(job.id).toBeDefined();
    expect(job.formato).toBe(FormatoExportacion.CSV);

    await new Promise((r) => setTimeout(r, 100));
    const status = facade.obtenerEstadoJob(job.id);
    expect(status.estado).toBe('COMPLETADO');
    expect(status.totalRegistros).toBe(2);
  });
});
