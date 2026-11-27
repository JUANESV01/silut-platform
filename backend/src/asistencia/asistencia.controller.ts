import { Controller, Get, Post, Put, Body, Param, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AsistenciaService } from './asistencia.service';
import { CrearSesionDto, GuardarAsistenciaDto } from './asistencia.dto';
import { Auditar, Roles } from '../common/decorators/auth.decorators';
import { RoleName } from '../common/enums';

@ApiTags('Asistencia y Sesiones')
@ApiBearerAuth()
@Controller()
export class AsistenciaController {
  constructor(private readonly asistenciaService: AsistenciaService) {}

  @Post('sesiones')
  @Roles(RoleName.EDUCADOR, RoleName.ADMINISTRATIVO, RoleName.ADMINISTRADOR)
  @Auditar('CREAR_SESION', 'Sesion')
  @ApiOperation({ summary: 'Crear u obtener sesión de clase para registrar asistencia (EDU-03)' })
  crearSesion(@Body() dto: CrearSesionDto, @Req() req: any) {
    return this.asistenciaService.crearOObtenerSesion(dto, req.user);
  }

  @Get('grupos/:grupoId/sesiones')
  @Roles(RoleName.EDUCADOR, RoleName.ADMINISTRATIVO, RoleName.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar sesiones registradas de un grupo' })
  listarSesiones(@Param('grupoId') grupoId: string, @Req() req: any) {
    return this.asistenciaService.listarSesionesPorGrupo(grupoId, req.user);
  }

  @Put('sesiones/:id/asistencia')
  @Roles(RoleName.EDUCADOR, RoleName.ADMINISTRATIVO, RoleName.ADMINISTRADOR)
  @Auditar('REGISTRAR_ASISTENCIA', 'Asistencia')
  @ApiOperation({ summary: 'Registrar o modificar asistencia en lote de una sesión (EDU-03)' })
  registrarAsistencia(
    @Param('id') id: string,
    @Body() dto: GuardarAsistenciaDto,
    @Req() req: any,
  ) {
    return this.asistenciaService.registrarAsistencia(id, dto, req.user);
  }

  @Get('grupos/:grupoId/reporte-asistencia')
  @Roles(RoleName.EDUCADOR, RoleName.ADMINISTRATIVO, RoleName.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Reporte estadístico consolidado de asistencia y alertas por grupo (EDU-04)',
  })
  reporteGrupo(@Param('grupoId') grupoId: string, @Req() req: any) {
    return this.asistenciaService.reporteAsistenciaGrupo(grupoId, req.user);
  }
}
