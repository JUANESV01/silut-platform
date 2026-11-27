import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReportFacade } from './report.facade';
import { Auditar, Roles } from '../common/decorators/auth.decorators';
import { FormatoExportacion, RoleName } from '../common/enums';

class SolicitarReporteDto {
  @IsEnum(FormatoExportacion)
  formato: FormatoExportacion;

  @IsOptional()
  @IsString()
  programaId?: string;

  @IsOptional()
  @IsString()
  grupoId?: string;

  @IsOptional()
  @IsString()
  barrio?: string;

  @IsOptional()
  @IsString()
  comuna?: string;

  @IsOptional()
  @IsString()
  ciudadOrigen?: string;

  @IsOptional()
  @IsString()
  genero?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  busqueda?: string;
}

@ApiTags('Reportes y Exportación')
@ApiBearerAuth()
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportFacade: ReportFacade) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(RoleName.ADMINISTRATIVO, RoleName.ADMINISTRADOR, RoleName.EDUCADOR)
  @Auditar('SOLICITAR_REPORTE', 'Reporte')
  @ApiOperation({
    summary:
      'Solicitar exportación asíncrona en XLSX, PDF o CSV; responde 202 con id de trabajo (ADM-04)',
  })
  solicitar(@Body() dto: SolicitarReporteDto) {
    const { formato, ...filtros } = dto;
    return this.reportFacade.solicitarReporteAsincrono(formato, filtros);
  }

  @Get('descarga-directa')
  @Roles(RoleName.ADMINISTRATIVO, RoleName.ADMINISTRADOR, RoleName.EDUCADOR)
  @Auditar('EXPORTAR_REPORTE', 'Reporte')
  @ApiOperation({ summary: 'Exportación inmediata en XLSX, PDF o CSV' })
  async descargaDirecta(
    @Query('formato') formato: FormatoExportacion = FormatoExportacion.XLSX,
    @Query('programaId') programaId: string | undefined,
    @Query('grupoId') grupoId: string | undefined,
    @Query('barrio') barrio: string | undefined,
    @Query('comuna') comuna: string | undefined,
    @Query('ciudadOrigen') ciudadOrigen: string | undefined,
    @Query('genero') genero: string | undefined,
    @Query('estado') estado: string | undefined,
    @Query('busqueda') busqueda: string | undefined,
    @Res() res: Response,
  ) {
    const { nombreArchivo, resultado } = await this.reportFacade.generarDirecto(
      formato,
      {
        programaId,
        grupoId,
        barrio,
        comuna,
        ciudadOrigen,
        genero,
        estado,
        busqueda,
      },
    );
    res.setHeader('Content-Type', resultado.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${nombreArchivo}"`,
    );
    return res.send(resultado.buffer);
  }

  @Get(':id')
  @Roles(RoleName.ADMINISTRATIVO, RoleName.ADMINISTRADOR, RoleName.EDUCADOR)
  @ApiOperation({ summary: 'Consultar estado del trabajo de reporte asíncrono' })
  obtenerEstado(@Param('id') id: string) {
    return this.reportFacade.obtenerEstadoJob(id);
  }

  @Get(':id/descargar')
  @Roles(RoleName.ADMINISTRATIVO, RoleName.ADMINISTRADOR, RoleName.EDUCADOR)
  @ApiOperation({ summary: 'Descargar archivo generado del trabajo de reporte' })
  descargar(@Param('id') id: string, @Res() res: Response) {
    const { nombreArchivo, resultado } = this.reportFacade.obtenerArchivoJob(id);
    res.setHeader('Content-Type', resultado.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${nombreArchivo}"`,
    );
    return res.send(resultado.buffer);
  }
}
