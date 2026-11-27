import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { MigracionService } from './migracion.service';
import { Auditar, Roles } from '../common/decorators/auth.decorators';
import { RoleName } from '../common/enums';

@ApiTags('Migración Alcaldía de Pereira')
@ApiBearerAuth()
@Controller('migracion')
export class MigracionController {
  constructor(private readonly migracionService: MigracionService) {}

  @Get('plantilla')
  @Roles(RoleName.ADMINISTRADOR, RoleName.ADMINISTRATIVO)
  @ApiOperation({ summary: 'Descargar plantilla CSV estandarizada para migración de la Alcaldía (R05)' })
  plantilla(@Res() res: Response) {
    const csv = this.migracionService.obtenerPlantillaCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="plantilla-migracion-alcaldia-pereira.csv"',
    );
    return res.send(csv);
  }

  @Post('importar')
  @Roles(RoleName.ADMINISTRADOR, RoleName.ADMINISTRATIVO)
  @Auditar('MIGRACION_ALCALDIA', 'Estudiante')
  @UseInterceptors(FileInterceptor('archivo'))
  @ApiOperation({
    summary: 'Validar (soloValidar=true) o ejecutar importación masiva desde CSV de la Alcaldía',
  })
  async importar(
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Body('csv') csvTexto: string | undefined,
    @Query('soloValidar') soloValidar?: string,
  ) {
    const contenido = archivo
      ? archivo.buffer.toString('utf-8')
      : csvTexto;
    if (!contenido || !contenido.trim()) {
      throw new BadRequestException(
        'Debe adjuntar un archivo CSV o enviar el contenido en el campo "csv".',
      );
    }
    return this.migracionService.ejecutarMigracion(
      contenido,
      soloValidar === 'true',
    );
  }
}
