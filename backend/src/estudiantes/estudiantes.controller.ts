import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EstudiantesService } from './estudiantes.service';
import {
  ActualizarPerfilEstudianteDto,
  RegistrarEstudianteDto,
} from './estudiantes.dto';
import { Auditar, Public, Roles } from '../common/decorators/auth.decorators';
import { RoleName } from '../common/enums';
import {
  BARRIOS_PEREIRA,
  CIUDADES_ORIGEN,
} from '../common/catalogs/pereira.catalog';

@ApiTags('Estudiantes')
@Controller('estudiantes')
export class EstudiantesController {
  constructor(private readonly estudiantesService: EstudiantesService) {}

  @Public()
  @Get('catalogos/ubicacion')
  @ApiOperation({
    summary: 'Catálogo normalizado de barrios/comunas de Pereira y ciudades de origen (R16)',
  })
  catalogosUbicacion() {
    return {
      barrios: BARRIOS_PEREIRA,
      ciudades: CIUDADES_ORIGEN,
    };
  }

  @Public()
  @Post('registro')
  @Auditar('REGISTRO_ESTUDIANTE', 'Estudiante')
  @ApiOperation({
    summary:
      'Registro de datos personales del estudiante, validación Ley 1581 y emisión de credenciales (EST-01, EST-03)',
  })
  registrar(@Body() dto: RegistrarEstudianteDto) {
    return this.estudiantesService.registrar(dto);
  }

  @ApiBearerAuth()
  @Get('me')
  @Roles(RoleName.ESTUDIANTE)
  @ApiOperation({
    summary:
      'Consulta académica propia: matrícula, docente, grupo, salón, horarios y progreso cualitativo (EST-04)',
  })
  miResumen(@Req() req: any) {
    return this.estudiantesService.obtenerMiResumenAcademico(req.user.id);
  }

  @ApiBearerAuth()
  @Patch('me')
  @Roles(RoleName.ESTUDIANTE)
  @Auditar('ACTUALIZAR_PERFIL_ESTUDIANTE', 'Estudiante')
  @ApiOperation({
    summary: 'Actualización autónoma de dirección y contacto del estudiante (EST-05)',
  })
  actualizarPerfil(
    @Body() dto: ActualizarPerfilEstudianteDto,
    @Req() req: any,
  ) {
    return this.estudiantesService.actualizarMiPerfil(req.user.id, dto);
  }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({
    summary: 'Consultar estudiante por ID con verificación de propiedad (ATAM S1)',
  })
  obtenerPorId(@Param('id') id: string, @Req() req: any) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown';
    return this.estudiantesService.obtenerPorId(id, req.user, ip);
  }
}
