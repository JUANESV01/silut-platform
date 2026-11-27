import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InscripcionesService } from './inscripciones.service';
import { CancelarInscripcionDto, CrearInscripcionDto } from './inscripciones.dto';
import { Auditar, Roles } from '../common/decorators/auth.decorators';
import { RoleName } from '../common/enums';

@ApiTags('Inscripciones y Matriculados')
@ApiBearerAuth()
@Controller()
export class InscripcionesController {
  constructor(private readonly inscripcionesService: InscripcionesService) {}

  @Post('inscripciones')
  @Roles(RoleName.ESTUDIANTE, RoleName.ADMINISTRATIVO, RoleName.ADMINISTRADOR)
  @Auditar('CREAR_INSCRIPCION', 'Inscripcion')
  @ApiOperation({
    summary: 'Inscribir estudiante en un grupo con validación transaccional de cupos (EST-02)',
  })
  inscribir(@Body() dto: CrearInscripcionDto, @Req() req: any) {
    return this.inscripcionesService.inscribir(dto, req.user);
  }

  @Patch('inscripciones/:id/cancelar')
  @Roles(RoleName.ESTUDIANTE, RoleName.ADMINISTRATIVO, RoleName.ADMINISTRADOR)
  @Auditar('CANCELAR_INSCRIPCION', 'Inscripcion')
  @ApiOperation({ summary: 'Cancelar o registrar retiro de una matrícula' })
  cancelar(
    @Param('id') id: string,
    @Body() dto: CancelarInscripcionDto,
    @Req() req: any,
  ) {
    return this.inscripcionesService.cancelar(id, dto, req.user);
  }

  @Get('matriculados')
  @Roles(RoleName.ADMINISTRATIVO, RoleName.ADMINISTRADOR, RoleName.EDUCADOR)
  @ApiOperation({
    summary: 'Consultar directorio de matriculados con filtros avanzados (ADM-02, ADM-03)',
  })
  listarMatriculados(
    @Query('programaId') programaId?: string,
    @Query('grupoId') grupoId?: string,
    @Query('barrio') barrio?: string,
    @Query('comuna') comuna?: string,
    @Query('ciudadOrigen') ciudadOrigen?: string,
    @Query('genero') genero?: string,
    @Query('estado') estado?: string,
    @Query('busqueda') busqueda?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.inscripcionesService.listarMatriculados({
      programaId,
      grupoId,
      barrio,
      comuna,
      ciudadOrigen,
      genero,
      estado,
      busqueda,
      page,
      limit,
    });
  }
}
