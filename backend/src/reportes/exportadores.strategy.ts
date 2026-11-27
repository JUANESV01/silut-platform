import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { FormatoExportacion } from '../common/enums';

export interface ColumnaReporte {
  key: string;
  header: string;
  width?: number;
}

export interface ResultadoExportacion {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

/**
 * Patrón Strategy + Factory Method (Entrega 2, Sec. 5.1 y ATAM M3).
 * Permite agregar nuevos formatos de exportación sin modificar ReportFacade ni controladores.
 */
export interface ExportadorStrategy {
  readonly formato: FormatoExportacion;
  exportar(
    titulo: string,
    columnas: ColumnaReporte[],
    filas: Record<string, any>[],
  ): Promise<ResultadoExportacion>;
}

@Injectable()
export class CsvExporter implements ExportadorStrategy {
  readonly formato = FormatoExportacion.CSV;

  async exportar(
    _titulo: string,
    columnas: ColumnaReporte[],
    filas: Record<string, any>[],
  ): Promise<ResultadoExportacion> {
    const escapeCell = (val: any) => {
      const str = val === null || val === undefined ? '' : String(val);
      if (/[",\n\r;]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerLine = columnas.map((c) => escapeCell(c.header)).join(',');
    const dataLines = filas.map((f) =>
      columnas.map((c) => escapeCell(f[c.key])).join(','),
    );
    // BOM UTF-8 para abrir tildes correctamente en Microsoft Excel
    const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n');

    return {
      buffer: Buffer.from(csvContent, 'utf-8'),
      contentType: 'text/csv; charset=utf-8',
      extension: 'csv',
    };
  }
}

@Injectable()
export class XlsxExporter implements ExportadorStrategy {
  readonly formato = FormatoExportacion.XLSX;

  async exportar(
    titulo: string,
    columnas: ColumnaReporte[],
    filas: Record<string, any>[],
  ): Promise<ResultadoExportacion> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SILUT · Centro Cultural Lucy Tejada (Pereira)';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Reporte SILUT');

    // Encabezado institucional SILUT
    sheet.mergeCells(1, 1, 1, Math.max(1, columnas.length));
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = `SILUT · CENTRO CULTURAL LUCY TEJADA (PEREIRA) — ${titulo}`;
    titleCell.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1B365D' },
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    sheet.getRow(1).height = 28;

    sheet.mergeCells(2, 1, 2, Math.max(1, columnas.length));
    const subCell = sheet.getCell(2, 1);
    subCell.value = `Generado por SILUT el ${new Date().toLocaleString('es-CO')} · Total registros: ${filas.length}`;
    subCell.font = { italic: true, size: 10, color: { argb: 'FF475569' } };
    sheet.getRow(2).height = 20;

    // Fila de encabezados de columnas
    const headerRow = sheet.getRow(4);
    columnas.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = col.header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFB47B2B' },
      };
      sheet.getColumn(i + 1).width = col.width || 22;
    });
    headerRow.height = 22;

    filas.forEach((fila, rowIdx) => {
      const row = sheet.getRow(5 + rowIdx);
      columnas.forEach((col, colIdx) => {
        row.getCell(colIdx + 1).value =
          fila[col.key] === null || fila[col.key] === undefined
            ? ''
            : String(fila[col.key]);
      });
    });

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx',
    };
  }
}

@Injectable()
export class PdfExporter implements ExportadorStrategy {
  readonly formato = FormatoExportacion.PDF;

  async exportar(
    titulo: string,
    columnas: ColumnaReporte[],
    filas: Record<string, any>[],
  ): Promise<ResultadoExportacion> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 36,
        size: 'LETTER',
        layout: 'landscape',
      });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () =>
        resolve({
          buffer: Buffer.concat(chunks),
          contentType: 'application/pdf',
          extension: 'pdf',
        }),
      );
      doc.on('error', reject);

      // Encabezado institucional SILUT (colores corporativos)
      doc.rect(0, 0, doc.page.width, 64).fill('#1B365D');
      doc
        .fillColor('#FFFFFF')
        .fontSize(15)
        .font('Helvetica-Bold')
        .text('SILUT · CENTRO CULTURAL LUCY TEJADA (PEREIRA)', 36, 16);
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(
          `${titulo}  |  Generado: ${new Date().toLocaleString('es-CO')}  |  Registros: ${filas.length}`,
          36,
          38,
        );

      doc.moveDown(2.5);
      doc.fillColor('#1E293B');

      const usableWidth = doc.page.width - 72;
      const colWidth = usableWidth / Math.max(1, columnas.length);
      let y = 82;

      const drawHeader = () => {
        doc.rect(36, y, usableWidth, 20).fill('#B47B2B');
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
        columnas.forEach((col, i) => {
          doc.text(col.header, 40 + i * colWidth, y + 6, {
            width: colWidth - 6,
            ellipsis: true,
            lineBreak: false,
          });
        });
        y += 22;
      };

      drawHeader();

      doc.font('Helvetica').fontSize(8);
      filas.forEach((fila, idx) => {
        if (y > doc.page.height - 56) {
          doc.addPage({ margin: 36, size: 'LETTER', layout: 'landscape' });
          y = 40;
          drawHeader();
          doc.font('Helvetica').fontSize(8);
        }

        if (idx % 2 === 1) {
          doc.rect(36, y - 2, usableWidth, 18).fill('#F8FAFC');
        }
        doc.fillColor('#0F172A');
        columnas.forEach((col, i) => {
          const val =
            fila[col.key] === null || fila[col.key] === undefined
              ? ''
              : String(fila[col.key]);
          doc.text(val, 40 + i * colWidth, y + 2, {
            width: colWidth - 6,
            ellipsis: true,
            lineBreak: false,
          });
        });
        y += 18;
      });

      doc.end();
    });
  }
}

@Injectable()
export class ExportadorFactory {
  private readonly estrategias: Map<FormatoExportacion, ExportadorStrategy>;

  constructor(
    xlsx: XlsxExporter,
    pdf: PdfExporter,
    csv: CsvExporter,
  ) {
    this.estrategias = new Map<FormatoExportacion, ExportadorStrategy>([
      [FormatoExportacion.XLSX, xlsx],
      [FormatoExportacion.PDF, pdf],
      [FormatoExportacion.CSV, csv],
    ]);
  }

  obtener(formato: FormatoExportacion): ExportadorStrategy {
    const estrategia = this.estrategias.get(formato);
    if (!estrategia) {
      throw new UnprocessableEntityException(
        `Formato de exportación no soportado: ${formato}`,
      );
    }
    return estrategia;
  }
}
